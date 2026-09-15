namespace DailyMarts.Api.DTOs;

public class CreateExchangeRequest
{
    public string? ExchangeType { get; set; } = "SWAP";
    public string RequestedProduct { get; set; } = string.Empty;
    public double RequiredQuantity { get; set; }
    public string? Unit { get; set; } = "L";
    public string? OfferedProduct { get; set; }
    public decimal? PricePerUnit { get; set; }
    public decimal? OfferedAmount { get; set; }
    public string? Notes { get; set; }
}
