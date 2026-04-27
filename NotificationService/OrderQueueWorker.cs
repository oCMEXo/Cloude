using System.Text.Json;
using Azure.Messaging.ServiceBus;

namespace NotificationService;

public class OrderQueueWorker : BackgroundService
{
    private readonly ServiceBusReceiver _receiver;
    private readonly ILogger<OrderQueueWorker> _logger;
    private readonly TimeSpan _interval;

    public OrderQueueWorker(ServiceBusClient client, IConfiguration config, ILogger<OrderQueueWorker> logger)
    {
        var queueName = config["ServiceBus:QueueName"]
            ?? throw new InvalidOperationException("ServiceBus:QueueName is missing.");

        var intervalSeconds = config.GetValue<int?>("ServiceBus:PollIntervalSeconds") ?? 10;
        _interval = TimeSpan.FromSeconds(intervalSeconds);

        _receiver = client.CreateReceiver(queueName, new ServiceBusReceiverOptions
        {
            ReceiveMode = ServiceBusReceiveMode.PeekLock
        });
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OrderQueueWorker started; polling every {Interval}", _interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var messages = await _receiver.ReceiveMessagesAsync(
                    maxMessages: 10,
                    maxWaitTime: TimeSpan.FromSeconds(2),
                    cancellationToken: stoppingToken);

                foreach (var msg in messages)
                {
                    try
                    {
                        var order = JsonSerializer.Deserialize<OrderDto>(msg.Body.ToString());
                        if (order is null)
                        {
                            _logger.LogWarning("Received empty/invalid payload, dead-lettering MessageId={MessageId}", msg.MessageId);
                            await _receiver.DeadLetterMessageAsync(msg, "InvalidPayload", "Body could not be deserialized", stoppingToken);
                            continue;
                        }

                        _logger.LogInformation(
                            "Notifying customer for order {OrderId} ({Email}), amount={Amount}",
                            order.OrderId, order.CustomerEmail, order.Amount);

                        // ... your business logic: send email, push notification, etc.

                        await _receiver.CompleteMessageAsync(msg, stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to process message {MessageId}", msg.MessageId);
                        await _receiver.AbandonMessageAsync(msg, cancellationToken: stoppingToken);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // graceful shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while polling queue");
            }

            try
            {
                await Task.Delay(_interval, stoppingToken);
            }
            catch (OperationCanceledException) { /* shutdown */ }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await _receiver.DisposeAsync();
        await base.StopAsync(cancellationToken);
    }
}

public record OrderDto(Guid OrderId, string CustomerEmail, decimal Amount);
