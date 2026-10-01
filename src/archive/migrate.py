import mysql.connector

cnx = mysql.connector.connect(
    host="185.114.247.43",
    port=3306,
    database="sch688_vvedenie",
    user="sch688_vvedenie",
    password="Qwerty123",
)
cur = cnx.cursor()

statements = [
    "ALTER TABLE users MODIFY password_hash VARCHAR(255) NOT NULL",
    "ALTER TABLE users ADD COLUMN lastname VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN balance DECIMAL(10,2) NOT NULL DEFAULT 0",
]

for sql in statements:
    try:
        cur.execute(sql)
        print("OK:", sql)
    except mysql.connector.Error as e:
        # если колонка уже есть — MySQL вернёт 1060, это не смертельно
        print("SKIP:", sql, "->", e)

cnx.commit()
cur.execute("DESCRIBE users")
for row in cur.fetchall():
    print(row)

cur.close()
cnx.close()