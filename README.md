# Azure Practice 2 — Local Apps with Azure PostgreSQL

## Структура проекта

```
user_service/
├── main.py          # FastAPI приложение, все эндпоинты
├── database.py      # Подключение к БД через SQLAlchemy
├── models.py        # Таблицы: user_service.users, user_service.roles
├── schemas.py       # Pydantic модели для ответов API
├── seed.py          # Создание схемы, таблиц и заполнение stub-данными
├── requirements.txt
└── .env             # ← сюда вставить connection string от учителя

order_service/
├── main.py          # FastAPI приложение, все эндпоинты
├── database.py      # Подключение к БД через SQLAlchemy
├── models.py        # Таблицы: order_service.orders, .order_items, .products
├── schemas.py       # Pydantic модели для ответов API
├── seed.py          # Создание схемы, таблиц и заполнение stub-данными
├── requirements.txt
└── .env             # ← сюда вставить connection string от учителя
```

---

## Схемы в базе данных

### user_service (схема)
| Таблица | Колонки |
|---------|---------|
| roles   | id, name, description, created_at |
| users   | id, username, email, full_name, role_id, created_at |

### order_service (схема)
| Таблица     | Колонки |
|-------------|---------|
| products    | id, name, description, price, stock, created_at |
| orders      | id, user_id, status, total_price, created_at |
| order_items | id, order_id, product_id, quantity, unit_price |

---

## Как запустить

### 1. Получить connection string от учителя и вставить в .env

**user_service/.env** и **order_service/.env**:
```
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST.postgres.database.azure.com:5432/DBNAME?sslmode=require
```

### 2. Установить зависимости

```bash
# UserService
cd user_service
pip install -r requirements.txt

# OrderService
cd ../order_service
pip install -r requirements.txt
```

### 3. Создать схемы, таблицы и заполнить данными

```bash
# UserService (запускать первым — OrderService ссылается на user_id)
cd user_service
python seed.py

# OrderService
cd ../order_service
python seed.py
```

### 4. Запустить сервисы

```bash
# UserService — порт 8001
cd user_service
uvicorn main:app --reload --port 8001

# OrderService — порт 8002 (в другом терминале)
cd order_service
uvicorn main:app --reload --port 8002
```

---

## API Эндпоинты

### UserService (http://localhost:8001)

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/` | Статус сервиса |
| GET | `/users` | Все пользователи |
| GET | `/users/{id}` | Пользователь по ID |
| GET | `/roles` | Все роли |
| GET | `/roles/{id}` | Роль по ID |

### OrderService (http://localhost:8002)

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/` | Статус сервиса |
| GET | `/products` | Все продукты |
| GET | `/products/{id}` | Продукт по ID |
| GET | `/orders` | Все заказы |
| GET | `/orders/{id}` | Заказ по ID |
| GET | `/orders/{id}/items` | Позиции заказа |

### Swagger UI (интерактивная документация)
- UserService:  http://localhost:8001/docs
- OrderService: http://localhost:8002/docs
