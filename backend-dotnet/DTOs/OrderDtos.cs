namespace DailyMarts.Api.DTOs;

public class CreateOrderRequest
{
    public string ProductId { get; set; } = string.Empty;
    public double Quantity { get; set; }
    public string? DeliverySlot { get; set; }
    public string? DeliveryDate { get; set; }
}

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
