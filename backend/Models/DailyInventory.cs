using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class DailyInventory
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("product")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Product { get; set; } = string.Empty;

    [BsonElement("productId")]
    public string ProductId { get; set; } = string.Empty;

    [BsonElement("farmer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Farmer { get; set; } = string.Empty;

    [BsonElement("date")]
    public string Date { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");

    [BsonElement("availableQuantity")]
    public double AvailableQuantity { get; set; }

    [BsonElement("soldQuantity")]
    public double SoldQuantity { get; set; } = 0;

    [BsonElement("remainingQuantity")]
    public double RemainingQuantity { get; set; }

    [BsonElement("unit")]
    public string Unit { get; set; } = "L";

    [BsonElement("price")]
    public decimal Price { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "AVAILABLE"; // AVAILABLE, LIMITED, SOLD_OUT

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonIgnore]
    public Product? ProductDetails { get; set; }

    [BsonIgnore]
    public User? FarmerDetails { get; set; }
}
