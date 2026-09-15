namespace DailyMarts.Api.DTOs;

public class CreateProductRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Description { get; set; }
    public string? Unit { get; set; } = "L";
    public decimal Price { get; set; }
    public string? FatContent { get; set; }
    public string? SnfContent { get; set; }
    public string? MilkingSlot { get; set; }
    public string? Packaging { get; set; }
    public bool? IsOrganic { get; set; }
    public bool? IsA2 { get; set; }
}

public class UpdateProductRequest
{
    public string? Name { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public decimal? Price { get; set; }
    public string? FatContent { get; set; }
    public string? SnfContent { get; set; }
    public string? MilkingSlot { get; set; }
    public string? Packaging { get; set; }
    public bool? IsOrganic { get; set; }
    public bool? IsA2 { get; set; }
    public string? Status { get; set; }
}

public class UpdateCapacityRequest
{
    public string? ProductId { get; set; }
    public string? Date { get; set; }
    public double AvailableQuantity { get; set; }
}
