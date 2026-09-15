using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class ProductExchange
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("exchangeId")]
    public string ExchangeId { get; set; } = string.Empty;

    [BsonElement("senderFarmer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SenderFarmer { get; set; } = string.Empty;

    [BsonElement("receiverFarmer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ReceiverFarmer { get; set; }

    [BsonElement("exchangeType")]
    public string ExchangeType { get; set; } = "SWAP"; // SWAP | PAID

    [BsonElement("requestedProduct")]
    public string RequestedProduct { get; set; } = string.Empty;

    [BsonElement("requiredQuantity")]
    public double RequiredQuantity { get; set; }

    [BsonElement("unit")]
    public string Unit { get; set; } = "L";

    [BsonElement("offeredProduct")]
    public string? OfferedProduct { get; set; }

    [BsonElement("pricePerUnit")]
    public decimal? PricePerUnit { get; set; }

    [BsonElement("offeredAmount")]
    public decimal? OfferedAmount { get; set; }

    [BsonElement("location")]
    public string Location { get; set; } = "Dindigul";

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "PENDING"; // PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonIgnore]
    public User? SenderFarmerDetails { get; set; }

    [BsonIgnore]
    public User? ReceiverFarmerDetails { get; set; }
}
