using Azure.Messaging.ServiceBus;
using OrderService;

var builder = WebApplication.CreateBuilder(args);

// Single ServiceBusClient instance — it's thread-safe and expensive to create.
builder.Services.AddSingleton(sp =>
{
    var connStr = builder.Configuration["ServiceBus:ConnectionString"]
        ?? throw new InvalidOperationException("ServiceBus:ConnectionString is missing. Set it in appsettings, user-secrets or env vars.");
    return new ServiceBusClient(connStr);
});

builder.Services.AddSingleton<OrderPublisher>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.MapControllers();
app.MapGet("/", () => "OrderService is running. POST /api/orders to publish a message.");

app.Run();
