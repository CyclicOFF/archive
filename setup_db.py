import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def setup_school_database():
    print("=" * 50)
    print("Подключение к школьной базе данных MySQL...")
    print(f"Хост: {os.getenv('DB_HOST')}")
    print(f"База: {os.getenv('DB_NAME')}")
    print("=" * 50)

    try:
        cnx = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            port=int(os.getenv("DB_PORT", 3306)),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
        )
    except Exception as e:
        print(f"\n❌ Ошибка подключения к базе данных:\n{e}")
        print("\nУбедитесь, что вы подключены к школьной сети и в .env указаны верные данные.")
        return

    cur = cnx.cursor()

    try:
        # 1. Таблица ai_messages (история сообщений ИИ)
        print("\n1. Проверка/создание таблицы 'ai_messages'...")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS ai_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            role VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        print("   ✅ Таблица 'ai_messages' готова!")

        # 2. Таблица transactions (история транзакций)
        print("\n2. Проверка/создание таблицы 'transactions'...")
        cur.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            amount INT NOT NULL,
            type VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        print("   ✅ Таблица 'transactions' готова!")

        cnx.commit()
        print("\n" + "=" * 50)
        print("🎉 ВСЁ УСПЕШНО НАСТРОЕНО!")
        print("Теперь в школьной БД работают и история чата, и история транзакций.")
        print("Не забудьте в .env в школе указать: DB_TYPE=mysql")
        print("=" * 50)

    except Exception as e:
        cnx.rollback()
        print(f"\n❌ Ошибка при создании таблиц:\n{e}")
    finally:
        cur.close()
        cnx.close()

if __name__ == "__main__":
    setup_school_database()
