using Microsoft.AspNetCore.Mvc;

namespace OrderService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly OrderPublisher _publisher;

    public OrdersController(OrderPublisher publisher) => _publisher = publisher;

    // POST /api/orders
    // Body: { "customerEmail": "user@example.com", "amount": 42.50 }
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var order = new OrderDto(
            OrderId: Guid.NewGuid(),
            CustomerEmail: request.CustomerEmail,
            Amount: request.Amount);

        await _publisher.PublishOrderAsync(order, ct);

        return Accepted(new { order.OrderId });
    }
}

public record CreateOrderRequest(string CustomerEmail, decimal Amount);
