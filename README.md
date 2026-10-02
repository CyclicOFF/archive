# Веб-приложение с AI-ассистентом и админ-панелью

Учебный проект на Flask: регистрация и авторизация пользователей, личный кабинет с балансом, платные запросы к нейросети GigaChat и админ-панель для управления пользователями и настройками.

---

## 📋 Возможности

### Для пользователей
- 🔐 **Регистрация** с хешированием пароля (werkzeug, `pbkdf2:sha256`)
- 🔑 **Авторизация** через сессию Flask
- 👤 **Личный кабинет**: имя, фамилия, email, баланс
- 💸 **Кнопка «Отдать деньги»** (заглушка, визуал)
- 🤖 **Запросы к GigaChat** — реальный ответ от нейросети
- 💰 **Автоматическое списание** баланса после успешного ответа ИИ

### Для администраторов
- 📊 **Статистика**: количество пользователей, админов, суммарный баланс
- ✏️ **Изменение баланса** любого пользователя
- 👑 **Назначение/снятие прав администратора**
- 🗑️ **Удаление пользователей**
- ⚙️ **Изменение цены** запроса к нейросети в реальном времени

---

## 🛠️ Стек технологий

| Слой | Технология |
|---|---|
| Backend | Python 3.8+, Flask |
| База данных | MySQL (mysql-connector-python) |
| Хеширование | werkzeug.security |
| AI | GigaChat API (SDK `gigachat`) |
| Frontend | HTML, CSS, jQuery 3.7 |
| Сервер | Flask dev server (для разработки) |

---

## 📁 Структура проекта

```
archive/
├── src/
│   └── archive/
│       ├── app.py                  # Основной Flask-сервер
│       ├── migrate.py              # Миграции БД
│       ├── sql_tool.py             # Утилита для работы с БД
│       ├── static/
│       │   ├── script.js           # JS для авторизации / регистрации / AI
│       │   └── admin.js            # JS для админ-панели
│       └── templates/
│           ├── registration.html   # Форма регистрации
│           ├── login.html          # Форма входа
│           ├── profile.html        # Личный кабинет
│           ├── ai.html             # Страница запроса к нейросети
│           ├── admin.html          # Админ-панель
│           └── 403.html            # Страница «Доступ запрещён»
├── .venv/                          # Виртуальное окружение
└── README.md
```

---

## 🚀 Установка и запуск

### 1. Клонирование

```bash
git clone <url-репозитория>
cd archive
```

### 2. Виртуальное окружение

```bash
python -m venv .venv
source .venv/bin/activate          # Linux / macOS
# или
.\.venv\Scripts\Activate.ps1       # Windows PowerShell
```

### 3. Установка зависимостей

```bash
python -m pip install flask mysql-connector-python werkzeug gigachat python-dotenv
```

> **Важно:** используйте `python -m pip`, а не просто `pip` — это гарантирует установку в активированное окружение.

### 4. Настройка базы данных

Подключитесь к своей БД MySQL и выполните:

```sql
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL,
    surname       VARCHAR(100) NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    balance       INT          NOT NULL DEFAULT 1000,
    is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    `key`   VARCHAR(50) PRIMARY KEY,
    `value` VARCHAR(255) NOT NULL
);

INSERT INTO settings (`key`, `value`)
VALUES ('ai_price', '3')
ON DUPLICATE KEY UPDATE `value` = `value`;
```

### 5. Настройка подключения к БД

Откройте `src/archive/app.py` и укажите свои данные в `DB_CONFIG`:

```python
DB_CONFIG = {
    "host": "x.x.x.x",
    "port": xxxx,
    "database": "имя_бд",
    "user": "имя_пользователя",
    "password": "пароль",
}
```

### 6. Получение ключа GigaChat

1. Зарегистрируйтесь на [developers.sber.ru](https://developers.sber.ru/portal/products/gigachat-api)
2. Создайте проект и получите **Authorization Key** (длинную Base64-строку)
3. Пропишите ключ в `app.py`:

```python
GIGACHAT_CREDENTIALS = os.getenv("GIGACHAT_KEY", "ваш_ключ_авторизации")
```

Или через переменную окружения:

```bash
export GIGACHAT_KEY="ваш_ключ"
```

### 7. Первый администратор

Один раз выполните через `sql_tool.py` или вручную в БД:

```sql
UPDATE users SET is_admin = 1 WHERE email = 'ваш_email@example.com';
```

После этого **перезайдите в аккаунт** — вас автоматически перекинет на `/admin`.

### 8. Запуск

```bash
python src/archive/app.py
```

Приложение будет доступно по адресу: **http://127.0.0.1:5000**

---

## 🔗 Маршруты

| Метод | URL | Описание |
|---|---|---|
| GET | `/` | Страница регистрации |
| GET | `/login` | Страница входа |
| POST | `/user_register` | API регистрации |
| POST | `/user_login` | API входа |
| GET | `/logout` | Выход |
| GET | `/profile` | Личный кабинет |
| GET | `/ai` | Страница запроса к нейросети |
| POST | `/ai_request` | API запроса к GigaChat |
| GET | `/admin` | Админ-панель (только админы) |
| POST | `/admin/user/<id>/balance` | Изменить баланс |
| POST | `/admin/user/<id>/toggle_admin` | Назначить/снять админа |
| POST | `/admin/user/<id>/delete` | Удалить пользователя |
| POST | `/admin/settings/ai_price` | Изменить цену AI |

---

## 🔒 Безопасность

- ✅ Пароли хранятся **только в виде хешей** (`pbkdf2:sha256`)
- ✅ Проверка подлинности через `werkzeug.security.check_password_hash`
- ✅ **Сессии Flask** для отслеживания пользователя
- ✅ **Двойная защита админки**: декоратор `@admin_required` проверяет флаг `is_admin` в БД при каждом запросе
- ✅ **Защита от SQL-инъекций** через параметризованные запросы (`%s`)
- ✅ **Атомарное списание** баланса (`balance = balance - price`) защищает от гонок
- ⚠️ **Секретный ключ Flask** (`app.secret_key`) замените на свой перед публикацией

---

## ⚙️ Изменение цены запроса к AI

Цена хранится в таблице `settings` под ключом `ai_price`. Менять можно:
- **Через админ-панель**: `/admin` → блок «Стоимость запроса к нейросети»
- **Напрямую в БД**: `UPDATE settings SET value = '5' WHERE key = 'ai_price';`

Изменение применяется мгновенно — без перезапуска сервера.

---

## 🧪 Проверка работоспособности

1. Зарегистрируйте нового пользователя — в БД появится строка с хешем пароля
2. Войдите — попадёте в `/profile`
3. Перейдите в `/ai`, отправьте запрос — баланс уменьшится на 3 ₽
4. Войдите под админом — попадёте в `/admin`, увидите таблицу пользователей
5. Измените баланс или цену AI и проверьте результат

---

## 📌 Известные ограничения

- Используется **dev-сервер Flask** — для продакшена нужен WSGI (gunicorn, uWSGI) или ASGI-обёртка
- Кнопка **«Отдать деньги»** пока заглушка — только визуал
- Нет страницы истории транзакций и логирования действий админов

---

## 🗺️ Возможные улучшения

- [ ] Реализовать реальный перевод денег между пользователями
- [ ] Добавить историю запросов к AI
- [ ] Логирование действий администраторов
- [ ] Двухфакторная аутентификация
- [ ] Ограничение количества запросов (rate limiting)
- [ ] Развёртывание на продакшен-сервере (gunicorn + nginx)
- [ ] Docker-контейнеризация

---

## 📄 Лицензия

Учебный проект. Свободно используйте в образовательных целях.
