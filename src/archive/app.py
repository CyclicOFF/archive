from flask import (Flask, render_template, request, jsonify,
                   session, redirect, url_for)
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "change-me-to-a-random-long-string"


DB_CONFIG = {
    "host": "185.114.247.43",
    "port": 3306,
    "database": "sch688_vvedenie",
    "user": "sch688_vvedenie",
    "password": "Qwerty123",
}


def get_db():
    return mysql.connector.connect(**DB_CONFIG)


# ---------- Страницы ----------
@app.route("/")
def registration():
    return render_template("registration.html")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/profile")
def profile():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    cnx = get_db()
    cur = cnx.cursor(dictionary=True)
    cur.execute(
        "SELECT username, surname, email, balance FROM users WHERE id = %s",
        (session["user_id"],)
    )
    user = cur.fetchone()
    cur.close()
    cnx.close()

    if user is None:
        session.clear()
        return redirect(url_for("login_page"))

    return render_template("profile.html", user=user)


@app.route("/ai")
def ai_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))

    cnx = get_db()
    cur = cnx.cursor(dictionary=True)
    cur.execute("SELECT balance FROM users WHERE id = %s",
                (session["user_id"],))
    row = cur.fetchone()
    cur.close(); cnx.close()

    if row is None:
        session.clear()
        return redirect(url_for("login_page"))

    return render_template("ai.html", balance=row["balance"])


# ---------- API ----------
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
        "SELECT id, username, password_hash FROM users WHERE email = %s",
        (email,)
    )
    user = cur.fetchone()
    cur.close(); cnx.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"status": "error",
                        "message": "Неверный email или пароль"}), 401

    session["user_id"]  = user["id"]
    session["username"] = user["username"]

    return jsonify({"status": "ok", "redirect": "/profile"})


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))


AI_PRICE = 3   # стоимость одного запроса в рублях


@app.route("/ai_request", methods=["POST"])
def ai_request():
    if "user_id" not in session:
        return jsonify({"status": "error",
                        "message": "Не авторизован"}), 401

    data = request.get_json() or {}
    prompt = (data.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"status": "error",
                        "message": "Введите запрос"}), 400

    cnx = get_db()
    cur = cnx.cursor(dictionary=True)

    # 1. Читаем текущий баланс
    cur.execute("SELECT balance FROM users WHERE id = %s",
                (session["user_id"],))
    row = cur.fetchone()

    if row is None:
        cur.close(); cnx.close()
        return jsonify({"status": "error",
                        "message": "Пользователь не найден"}), 404

    if row["balance"] < AI_PRICE:
        cur.close(); cnx.close()
        return jsonify({
            "status": "error",
            "message": f"Недостаточно средств. Нужно {AI_PRICE} ₽, у вас {row['balance']} ₽"
        }), 402

    # 2. Списываем 3 рубля одним запросом
    cur.execute(
        "UPDATE users SET balance = balance - %s WHERE id = %s",
        (AI_PRICE, session["user_id"])
    )
    cnx.commit()

    # 3. Отдаём новый баланс клиенту
    cur.execute("SELECT balance FROM users WHERE id = %s",
                (session["user_id"],))
    new_balance = cur.fetchone()["balance"]

    cur.close(); cnx.close()

    return jsonify({
        "status": "ok",
        "answer": f"[Демо-ответ нейросети на запрос: «{prompt}»]",
        "balance": new_balance,
        "spent": AI_PRICE
    })


if __name__ == "__main__":
    app.run(debug=True)