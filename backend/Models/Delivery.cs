using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class Delivery
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("subscription")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Subscription { get; set; }

    [BsonElement("order")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Order { get; set; }

    [BsonElement("customer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Customer { get; set; } = string.Empty;

    [BsonElement("farmer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Farmer { get; set; } = string.Empty;

    [BsonElement("product")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Product { get; set; } = string.Empty;

    [BsonElement("date")]
    public string Date { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");

    [BsonElement("deliverySlot")]
    public string DeliverySlot { get; set; } = "MORNING"; // MORNING, EVENING, BOTH

    [BsonElement("requestedQuantity")]
    public double RequestedQuantity { get; set; }

    [BsonElement("deliveredQuantity")]
    public double DeliveredQuantity { get; set; } = 0;

    [BsonElement("unit")]
    public string Unit { get; set; } = "L";

    [BsonElement("pricePerUnit")]
    public decimal PricePerUnit { get; set; }

    [BsonElement("totalCost")]
    public decimal TotalCost { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "PENDING"; // PENDING, DELIVERED, SKIPPED, CANCELLED, FAILED

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonIgnore]
    public Product? ProductDetails { get; set; }

    [BsonIgnore]
    public User? CustomerDetails { get; set; }

    [BsonIgnore]
    public User? FarmerDetails { get; set; }
}
