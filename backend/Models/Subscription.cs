using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class Subscription
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("subscriptionId")]
    public string SubscriptionId { get; set; } = string.Empty;

    [BsonElement("customer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Customer { get; set; } = string.Empty;

    [BsonElement("farmer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Farmer { get; set; } = string.Empty;

    [BsonElement("product")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Product { get; set; } = string.Empty;

    [BsonElement("quantity")]
    public double Quantity { get; set; } = 1;

    [BsonElement("unit")]
    public string Unit { get; set; } = "L";

    [BsonElement("frequency")]
    public string Frequency { get; set; } = "DAILY"; // DAILY, WEEKLY, MONTHLY

    [BsonElement("deliverySlot")]
    public string DeliverySlot { get; set; } = "MORNING"; // MORNING, EVENING, BOTH

    [BsonElement("startDate")]
    public string StartDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");

    [BsonElement("endDate")]
    public string? EndDate { get; set; }

    [BsonElement("durationDays")]
    public int DurationDays { get; set; } = 30;

    [BsonElement("pricePerUnit")]
    public decimal PricePerUnit { get; set; }

    [BsonElement("estimatedMonthlyAmount")]
    public decimal EstimatedMonthlyAmount { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, PAUSED, CANCELLED, EXPIRED

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties for JSON population
    [BsonIgnore]
    public Product? ProductDetails { get; set; }

    [BsonIgnore]
    public User? FarmerDetails { get; set; }

    [BsonIgnore]
    public User? CustomerDetails { get; set; }
}
