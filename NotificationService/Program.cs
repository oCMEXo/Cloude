using Azure.Messaging.ServiceBus;
using NotificationService;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSingleton(sp =>
{
    var connStr = builder.Configuration["ServiceBus:ConnectionString"]
        ?? throw new InvalidOperationException("ServiceBus:ConnectionString is missing. Set it in appsettings, user-secrets or env vars.");
    return new ServiceBusClient(connStr);
});

builder.Services.AddHostedService<OrderQueueWorker>();

var host = builder.Build();
await host.RunAsync();
