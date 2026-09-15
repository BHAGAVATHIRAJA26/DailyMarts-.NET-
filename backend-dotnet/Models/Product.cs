using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class Product
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("productId")]
    public string ProductId { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("category")]
    public string Category { get; set; } = "MILK"; // MILK, MILK_PRODUCT, VEGETABLE, CHICKEN, MEAT, OTHER

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("unit")]
    public string Unit { get; set; } = "L";

    [BsonElement("price")]
    public decimal Price { get; set; }

    [BsonElement("farmer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Farmer { get; set; } = string.Empty;

    [BsonElement("location")]
    public string Location { get; set; } = "Dindigul";

    [BsonElement("emoji")]
    public string Emoji { get; set; } = "🥛";

    // Milk & Dairy Attributes
    [BsonElement("fatContent")]
    public string? FatContent { get; set; }

    [BsonElement("snfContent")]
    public string? SnfContent { get; set; }

    [BsonElement("milkingSlot")]
    public string? MilkingSlot { get; set; }

    [BsonElement("packaging")]
    public string Packaging { get; set; } = "Eco Glass Bottle";

    [BsonElement("isOrganic")]
    public bool IsOrganic { get; set; } = true;

    [BsonElement("isA2")]
    public bool IsA2 { get; set; } = false;

    [BsonElement("status")]
    public string Status { get; set; } = "AVAILABLE"; // AVAILABLE, LIMITED, SOLD_OUT, INACTIVE

    [BsonElement("rating")]
    public double Rating { get; set; } = 4.8;

    [BsonElement("reviewCount")]
    public int ReviewCount { get; set; } = 50;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Populated navigation property for API JSON serialization
    [BsonIgnore]
    public User? FarmerDetails { get; set; }
}
