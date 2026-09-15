namespace DailyMarts.Api.DTOs;

public class RecordPaymentRequest
{
    public string? BillId { get; set; }
    public decimal Amount { get; set; }
}

public class GenerateBillRequest
{
    public string SubscriptionId { get; set; } = string.Empty;
    public string? CustomerId { get; set; }
    public string? Period { get; set; }
}
