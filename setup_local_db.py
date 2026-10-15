import os
import sqlite3
from werkzeug.security import generate_password_hash

DB_FILE = os.path.join(os.path.dirname(__file__), "database.db")

def init_sqlite_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()

    # 1. Таблица настроек
    cur.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        `key` VARCHAR(50) PRIMARY KEY,
        `value` TEXT NOT NULL
    )
    """)

    # 2. Таблица пользователей
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) NOT NULL,
        surname VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        balance INTEGER DEFAULT 100,
        is_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 3. Таблица истории сообщений ИИ
    cur.execute("""
    CREATE TABLE IF NOT EXISTS ai_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 4. Таблица транзакций
    cur.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Устанавливаем дефолтную цену запроса
    cur.execute("""
    INSERT INTO settings (`key`, `value`) VALUES ('ai_price', '3')
    ON CONFLICT(`key`) DO NOTHING
    """)

    # Создаем тестового пользователя и админа для удобного входа
    admin_hash = generate_password_hash("admin123")
    user_hash = generate_password_hash("user123")

    cur.execute("""
    INSERT INTO users (username, surname, email, password_hash, balance, is_admin)
    VALUES ('Администратор', 'Главный', 'admin@test.ru', ?, 500, 1)
    ON CONFLICT(email) DO NOTHING
    """, (admin_hash,))

    cur.execute("""
    INSERT INTO users (username, surname, email, password_hash, balance, is_admin)
    VALUES ('Тестовый', 'Пользователь', 'user@test.ru', ?, 100, 0)
    ON CONFLICT(email) DO NOTHING
    """, (user_hash,))

    conn.commit()
    conn.close()
    print("Локальная база данных SQLite успешно создана в database.db!")
    print("Созданы аккаунты для входа:")
    print(" - Админ: admin@test.ru / admin123 (баланс: 500)")
    print(" - Юзер:  user@test.ru / user123 (баланс: 100)")

if __name__ == "__main__":
    init_sqlite_db()

