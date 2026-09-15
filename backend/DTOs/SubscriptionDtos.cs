namespace DailyMarts.Api.DTOs;

public class CreateSubscriptionRequest
{
    public string ProductId { get; set; } = string.Empty;
    public string? FarmerId { get; set; }
    public double Quantity { get; set; } = 1;
    public string? Frequency { get; set; } = "DAILY";
    public string? DeliverySlot { get; set; } = "MORNING";
    public string? StartDate { get; set; }
    public int? DurationDays { get; set; } = 30;
}
