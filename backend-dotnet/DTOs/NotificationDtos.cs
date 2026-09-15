namespace DailyMarts.Api.DTOs;

public class SendCustomEmailRequest
{
    public string CustomerId { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string? Message { get; set; }
    public object? Data { get; set; }
}

public class CreateCancellationRequest
{
    public string? SubscriptionId { get; set; }
    public string? OrderId { get; set; }
    public string? CancellationType { get; set; } = "SINGLE_DAY";
    public string? SkipDate { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public string? Reason { get; set; }
}
