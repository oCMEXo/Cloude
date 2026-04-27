using System.Text.Json;
using Azure.Messaging.ServiceBus;

namespace OrderService;

public class OrderPublisher : IAsyncDisposable
{
    private readonly ServiceBusSender _sender;
    private readonly ILogger<OrderPublisher> _logger;

    public OrderPublisher(ServiceBusClient client, IConfiguration config, ILogger<OrderPublisher> logger)
    {
        var queueName = config["ServiceBus:QueueName"]
            ?? throw new InvalidOperationException("ServiceBus:QueueName is missing.");
        _sender = client.CreateSender(queueName);
        _logger = logger;
    }

    public async Task PublishOrderAsync(OrderDto order, CancellationToken ct = default)
    {
        var payload = JsonSerializer.Serialize(order);
        var message = new ServiceBusMessage(payload)
        {
            ContentType = "application/json",
            MessageId = order.OrderId.ToString(),
            Subject = "OrderCreated"
        };

        await _sender.SendMessageAsync(message, ct);
        _logger.LogInformation("Sent order {OrderId} to queue", order.OrderId);
    }

    public async ValueTask DisposeAsync() => await _sender.DisposeAsync();
}

public record OrderDto(Guid OrderId, string CustomerEmail, decimal Amount);
