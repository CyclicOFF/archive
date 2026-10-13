from flask import (Flask, render_template, request, jsonify,
                   session, redirect, url_for, abort)
from functools import wraps
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
import os
from gigachat import GigaChatSyncClient
from gigachat.models import ChatCompletionRequest, ChatMessage

from dotenv import load_dotenv
import sqlite3

# Загружаем переменные окружения из .env файла
load_dotenv()

GIGACHAT_CREDENTIALS = os.getenv("GIGACHAT_KEY")

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "fallback-secret-key")

DB_TYPE = os.getenv("DB_TYPE", "mysql").lower()
DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}
SQLITE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "database.db")

DEFAULT_AI_PRICE = 3


class SQLiteCursorWrapper:
    """Обертка над курсором SQLite для совместимости с синтаксисом mysql.connector (%s и dictionary=True)."""
    def __init__(self, cursor, dictionary=False):
        self._cur = cursor
        self._dict = dictionary

    def execute(self, query, params=None):
        query = query.replace("%s", "?")
        if params is None:
            return self._cur.execute(query)
        return self._cur.execute(query, params)

    def fetchone(self):
        row = self._cur.fetchone()
        if row is None:
            return None
        if self._dict and hasattr(row, "keys"):
            return dict(row)
        return row

    def fetchall(self):
        rows = self._cur.fetchall()
        if self._dict and rows and hasattr(rows[0], "keys"):
            return [dict(r) for r in rows]
        return rows

    @property
    def rowcount(self):
        return self._cur.rowcount

    def close(self):
        self._cur.close()


class SQLiteConnectionWrapper:
    """Обертка над соединением SQLite для единого интерфейса с MySQL."""
    def __init__(self, connection):
        self._conn = connection

    def cursor(self, dictionary=False):
        if dictionary:
            self._conn.row_factory = sqlite3.Row
        else:
            self._conn.row_factory = None
        return SQLiteCursorWrapper(self._conn.cursor(), dictionary=dictionary)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def get_db():
    if DB_TYPE == "sqlite":
        conn = sqlite3.connect(SQLITE_PATH)
        return SQLiteConnectionWrapper(conn)
    return mysql.connector.connect(**DB_CONFIG)


def get_ai_price():
    """Читает цену запроса из БД. Если что-то не так — возвращает дефолт."""
    try:
        cnx = get_db()
        cur = cnx.cursor(dictionary=True)
        cur.execute("SELECT `value` FROM settings WHERE `key` = 'ai_price'")
        row = cur.fetchone()
        cur.close(); cnx.close()
        return int(row["value"]) if row else DEFAULT_AI_PRICE
    except Exception:
        return DEFAULT_AI_PRICE


def set_ai_price(new_price):
    cnx = get_db()
    cur = cnx.cursor()
    if DB_TYPE == "sqlite":
        cur.execute(
            "INSERT INTO settings (`key`, `value`) VALUES ('ai_price', %s) "
            "ON CONFLICT(`key`) DO UPDATE SET `value` = excluded.value",
            (str(new_price),)
        )
    else:
        cur.execute(
            "INSERT INTO settings (`key`, `value`) VALUES ('ai_price', %s) "
            "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
            (str(new_price),)
        )
    cnx.commit()
    cur.close(); cnx.close()


# ---------- Декораторы ----------
def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    """Только для админов. Проверяет флаг is_admin в БД (свежий)."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login_page"))

        cnx = get_db()
        cur = cnx.cursor(dictionary=True)
        cur.execute("SELECT is_admin FROM users WHERE id = %s",
                    (session["user_id"],))
        row = cur.fetchone()
        cur.close(); cnx.close()

        if not row or not row["is_admin"]:
            abort(403)   # Forbidden
        return f(*args, **kwargs)
    return wrapper


# ---------- Страницы ----------
@app.route("/")
def registration():
    return render_template("registration.html")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/profile")
@login_required
def profile():
    cnx = get_db()
    cur = cnx.cursor(dictionary=True)
    cur.execute(
        "SELECT username, surname, email, balance, is_admin "
        "FROM users WHERE id = %s",
        (session["user_id"],)
    )
    user = cur.fetchone()
    cur.close(); cnx.close()

    if user is None:
        session.clear()
        return redirect(url_for("login_page"))

    return render_template("profile.html", user=user)


@app.route("/ai")
@login_required
def ai_page():
    cnx = get_db()
    cur = cnx.cursor(dictionary=True)
    cur.execute("SELECT balance FROM users WHERE id = %s",
                (session["user_id"],))
    row = cur.fetchone()
    cur.close(); cnx.close()

    if row is None:
        session.clear()
        return redirect(url_for("login_page"))

    return render_template("ai.html",
                           balance=row["balance"],
                           price=get_ai_price())


# ---------- API регистрации / входа ----------
@app.route("/user_register", methods=["POST"])
def user_register():
    req = request.get_json() or {}
    name     = (req.get("name") or "").strip()
    lastname = (req.get("lastname") or "").strip() or None
    email    = (req.get("email") or "").strip().lower()
    password = req.get("password") or ""

    if not name or not email or not password:
        return jsonify({"status": "error",
                        "message": "Заполните все поля"}), 400

    password_hash = generate_password_hash(password)

    cnx = get_db()
    cur = cnx.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        cur.close(); cnx.close()
        return jsonify({"status": "error",
                        "message": "Пользователь с таким email уже существует"}), 400

    cur.execute(
        "INSERT INTO users (username, surname, email, password_hash) "
        "VALUES (%s, %s, %s, %s)",
        (name, lastname, email, password_hash)
    )
    cnx.commit()
    cur.close(); cnx.close()
    return jsonify({"status": "ok", "redirect": "/login"})


@app.route("/user_login", methods=["POST"])
def user_login():
    req = request.get_json() or {}
    email    = (req.get("email") or "").strip().lower()
    password = req.get("password") or ""

    cnx = get_db()
    cur = cnx.cursor(dictionary=True)
    cur.execute(
        "SELECT id, username, password_hash, is_admin "
        "FROM users WHERE email = %s",
        (email,)
    )
    user = cur.fetchone()
    cur.close(); cnx.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"status": "error",
                        "message": "Неверный email или пароль"}), 401

    session["user_id"]  = user["id"]
    session["username"] = user["username"]
    session["is_admin"] = bool(user["is_admin"])   # удобно для шаблонов

    # Админов сразу ведём в админку
    redirect_to = "/admin" if user["is_admin"] else "/profile"
    return jsonify({"status": "ok", "redirect": redirect_to})


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))


# ---------- AI ----------
@app.route("/ai_request", methods=["POST"])
@login_required
def ai_request():
    data = request.get_json() or {}
    prompt = (data.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"status": "error", "message": "Введите запрос"}), 400

    price = get_ai_price()

    cnx = get_db()
    cur = cnx.cursor(dictionary=True)
    cur.execute("SELECT balance FROM users WHERE id = %s",
                (session["user_id"],))
    row = cur.fetchone()
    if row is None:
        cur.close(); cnx.close()
        return jsonify({"status": "error",
                        "message": "Пользователь не найден"}), 404

    if row["balance"] < price:
        cur.close(); cnx.close()
        return jsonify({
            "status": "error",
            "message": f"Недостаточно средств. Нужно {price} ₽, у вас {row['balance']} ₽"
        }), 402

    # === ЗАПРОС К GIGACHAT ===
    # Получаем последние 10 сообщений для контекста
    cur.execute(
        "SELECT role, content FROM ai_messages WHERE user_id = %s ORDER BY id DESC LIMIT 10",
        (session["user_id"],)
    )
    history = cur.fetchall()
    history.reverse()  # возвращаем в хронологический порядок для модели
    
    messages_payload = []
    for msg in history:
        messages_payload.append(ChatMessage(role=msg["role"], content=msg["content"]))
    messages_payload.append(ChatMessage(role="user", content=prompt))

    try:
        with GigaChatSyncClient(
            credentials=GIGACHAT_CREDENTIALS,
            base_url="https://api.giga.chat/v1",
            model="GigaChat-2",
            scope="GIGACHAT_API_PERS",
            verify_ssl_certs=False,
        ) as giga:
            ai_chat = ChatCompletionRequest(
                model="GigaChat-2",
                messages=messages_payload
            )
            response = giga.chat.create(ai_chat)
            answer = response.messages[0].content[0].text
    except Exception as e:
        cur.close(); cnx.close()
        return jsonify({
            "status": "error",
            "message": f"Ошибка нейросети: {str(e)}"
        }), 502
    # =========================

    # Списываем деньги только ПОСЛЕ успешного ответа
    cur.execute(
        "UPDATE users SET balance = balance - %s WHERE id = %s",
        (price, session["user_id"])
    )
    
    # Сохраняем запрос и ответ в историю
    cur.execute(
        "INSERT INTO ai_messages (user_id, role, content) VALUES (%s, %s, %s)",
        (session["user_id"], "user", prompt)
    )
    cur.execute(
        "INSERT INTO ai_messages (user_id, role, content) VALUES (%s, %s, %s)",
        (session["user_id"], "assistant", answer)
    )
    
    cnx.commit()

    cur.execute("SELECT balance FROM users WHERE id = %s",
                (session["user_id"],))
    new_balance = cur.fetchone()["balance"]
    cur.close(); cnx.close()

    return jsonify({
        "status": "ok",
        "answer": answer,
        "balance": new_balance,
        "spent": price
    })

@app.route("/api/ai_history", methods=["GET"])
@login_required
def get_ai_history():
    cnx = get_db()
    cur = cnx.cursor(dictionary=True)
    cur.execute(
        "SELECT role, content, created_at FROM ai_messages WHERE user_id = %s ORDER BY id ASC",
        (session["user_id"],)
    )
    history = cur.fetchall()
    cur.close(); cnx.close()
    
    return jsonify({"status": "ok", "history": history})


@app.route("/api/ai_clear", methods=["POST"])
@login_required
def clear_ai_history():
    cnx = get_db()
    cur = cnx.cursor()
    cur.execute("DELETE FROM ai_messages WHERE user_id = %s", (session["user_id"],))
    cnx.commit()
    cur.close(); cnx.close()
    return jsonify({"status": "ok", "message": "История чата очищена"})


# ==========================================================
# ==============           АДМИНКА           ===============
# ==========================================================

@app.route("/admin")
@admin_required
def admin_page():
    cnx = get_db()
    cur = cnx.cursor(dictionary=True)
    cur.execute(
        "SELECT id, username, surname, email, balance, is_admin, created_at "
        "FROM users ORDER BY id ASC"
    )
    users = cur.fetchall()

    cur.execute("SELECT COUNT(*) AS c FROM users")
    total_users = cur.fetchone()["c"]

    cur.execute("SELECT COALESCE(SUM(balance),0) AS s FROM users")
    total_balance = cur.fetchone()["s"]

    cur.execute("SELECT COUNT(*) AS c FROM users WHERE is_admin = 1")
    total_admins = cur.fetchone()["c"]

    cur.close(); cnx.close()

    return render_template(
        "admin.html",
        users=users,
        total_users=total_users,
        total_balance=total_balance,
        total_admins=total_admins,
        ai_price=get_ai_price(),   # ← NEW
    )

@app.route("/admin/settings/ai_price", methods=["POST"])
@admin_required
def admin_set_ai_price():
    data = request.get_json() or {}
    try:
        new_price = int(data.get("price"))
    except (TypeError, ValueError):
        return jsonify({"status": "error",
                        "message": "Цена должна быть целым числом"}), 400

    if new_price < 0:
        return jsonify({"status": "error",
                        "message": "Цена не может быть отрицательной"}), 400

    if new_price > 100000:
        return jsonify({"status": "error",
                        "message": "Слишком большая цена"}), 400

    set_ai_price(new_price)
    return jsonify({"status": "ok", "price": new_price})


@app.route("/admin/user/<int:user_id>/balance", methods=["POST"])
@admin_required
def admin_set_balance(user_id):
    data = request.get_json() or {}
    try:
        new_balance = int(data.get("balance"))
    except (TypeError, ValueError):
        return jsonify({"status": "error",
                        "message": "Баланс должен быть числом"}), 400

    cnx = get_db()
    cur = cnx.cursor()
    cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
    if not cur.fetchone():
        cur.close(); cnx.close()
        return jsonify({"status": "error",
                        "message": "Пользователь не найден"}), 404

    cur.execute("UPDATE users SET balance = %s WHERE id = %s",
                (new_balance, user_id))
    cnx.commit()
    cur.close(); cnx.close()

    return jsonify({"status": "ok", "balance": new_balance})


@app.route("/admin/user/<int:user_id>/toggle_admin", methods=["POST"])
@admin_required
def admin_toggle_admin(user_id):
    if user_id == session["user_id"]:
        return jsonify({"status": "error",
                        "message": "Нельзя снять права с самого себя"}), 400

    cnx = get_db()
    cur = cnx.cursor(dictionary=True)
    cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    if not row:
        cur.close(); cnx.close()
        return jsonify({"status": "error",
                        "message": "Пользователь не найден"}), 404

    new_flag = 0 if row["is_admin"] else 1
    cur.execute("UPDATE users SET is_admin = %s WHERE id = %s",
                (new_flag, user_id))
    cnx.commit()
    cur.close(); cnx.close()

    return jsonify({"status": "ok", "is_admin": new_flag})


@app.route("/admin/user/<int:user_id>/delete", methods=["POST"])
@admin_required
def admin_delete_user(user_id):
    if user_id == session["user_id"]:
        return jsonify({"status": "error",
                        "message": "Нельзя удалить самого себя"}), 400

    cnx = get_db()
    cur = cnx.cursor()
    cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
    cnx.commit()
    affected = cur.rowcount
    cur.close(); cnx.close()

    if affected == 0:
        return jsonify({"status": "error",
                        "message": "Пользователь не найден"}), 404

    return jsonify({"status": "ok"})


# ---------- 403 страница ----------
@app.errorhandler(403)
def forbidden(e):
    return render_template("403.html"), 403


if __name__ == "__main__":
    app.run(debug=True)