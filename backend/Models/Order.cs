using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class Order
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("orderId")]
    public string OrderId { get; set; } = string.Empty;

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
    public double Quantity { get; set; }

    [BsonElement("unit")]
    public string Unit { get; set; } = "L";

    [BsonElement("pricePerUnit")]
    public decimal PricePerUnit { get; set; }

    [BsonElement("totalAmount")]
    public decimal TotalAmount { get; set; }

    [BsonElement("orderDate")]
    public string OrderDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");

    [BsonElement("deliveryDate")]
    public string DeliveryDate { get; set; } = DateTime.UtcNow.ToString("yyyy-MM-dd");

    [BsonElement("deliverySlot")]
    public string DeliverySlot { get; set; } = "MORNING"; // MORNING, EVENING, BOTH

    [BsonElement("orderStatus")]
    public string OrderStatus { get; set; } = "CONFIRMED"; // PENDING, CONFIRMED, PREPARING, READY, DELIVERED, SUPPLIED, CANCELLED, COMPLETED

    [BsonElement("paymentStatus")]
    public string PaymentStatus { get; set; } = "PENDING"; // PAID, PARTIALLY_PAID, PENDING, OVERDUE

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
