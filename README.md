# Service Bus Demo — два локальных приложения через очередь

Два приложения общаются через одну очередь Azure Service Bus:

- **OrderService** (Web API) — отправляет сообщение по триггеру `POST /api/orders`. Использует **Send** connection string.
- **NotificationService** (Worker) — фоновый процесс, читает очередь с интервалом (по умолчанию 10 сек). Использует **Listen** connection string.

```
[OrderService] --send--> [Service Bus Queue] --receive--> [NotificationService]
```

## Требования

- .NET 8 SDK
- Имя очереди и две connection string-и от учителя (одна Send-only, одна Listen-only)

## Настройка connection string-ов

### Вариант 1 — appsettings.json (быстро, для теста)

В `OrderService/appsettings.json` подставь **Send** строку:
```json
"ServiceBus": {
  "ConnectionString": "Endpoint=sb://...;SharedAccessKeyName=SendOnly;SharedAccessKey=...;EntityPath=orders-queue",
  "QueueName": "orders-queue"
}
```

В `NotificationService/appsettings.json` подставь **Listen** строку.

### Вариант 2 — user-secrets (рекомендую, не попадёт в git)

```bash
cd OrderService
dotnet user-secrets set "ServiceBus:ConnectionString" "<SEND_STRING>"
dotnet user-secrets set "ServiceBus:QueueName" "orders-queue"

cd ../NotificationService
dotnet user-secrets set "ServiceBus:ConnectionString" "<LISTEN_STRING>"
dotnet user-secrets set "ServiceBus:QueueName" "orders-queue"
```

Если в connection string уже есть `EntityPath=...`, имя очереди можно не указывать отдельно — но в коде оно используется явно, так что лучше задать.

## Запуск

В двух разных терминалах:

```bash
# Terminal 1
cd OrderService
dotnet run

# Terminal 2
cd NotificationService
dotnet run
```

## Триггер отправки

```bash
curl -X POST http://localhost:5080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerEmail":"a@b.com","amount":42.5}'
```

Через ~10 секунд в логе NotificationService появится строка:
`Notifying customer for order <guid> (a@b.com), amount=42.5`

## Что внутри

- `ServiceBusClient` зарегистрирован как singleton (он thread-safe и дорогой в создании).
- Receiver работает в `PeekLock`-режиме: сообщение удаляется из очереди только после `CompleteMessageAsync`. При ошибке вызывается `AbandonMessageAsync` — сообщение сразу станет доступно для повторной обработки. Невалидные payload-ы уходят в dead-letter.
- Интервал опроса настраивается через `ServiceBus:PollIntervalSeconds`.

## Структура

```
servicebus-demo/
├── ServiceBusDemo.sln
├── OrderService/
│   ├── Controllers/OrdersController.cs   # POST /api/orders — триггер отправки
│   ├── OrderPublisher.cs                 # обёртка над ServiceBusSender
│   ├── Program.cs
│   ├── appsettings.json                  # ← SEND connection string
│   └── OrderService.csproj
└── NotificationService/
    ├── OrderQueueWorker.cs               # BackgroundService с интервалом
    ├── Program.cs
    ├── appsettings.json                  # ← LISTEN connection string
    └── NotificationService.csproj
```
