using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class Payment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("paymentId")]
    public string PaymentId { get; set; } = string.Empty;

    [BsonElement("transactionId")]
    public string? TransactionId { get; set; }

    [BsonElement("customer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Customer { get; set; } = string.Empty;

    [BsonElement("farmer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Farmer { get; set; } = string.Empty;

    [BsonElement("bill")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Bill { get; set; } = string.Empty;

    [BsonElement("amount")]
    public decimal Amount { get; set; }

    [BsonElement("paymentMethod")]
    public string PaymentMethod { get; set; } = "UPI"; // UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING, CASH

    [BsonElement("paymentDate")]
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    [BsonElement("status")]
    public string Status { get; set; } = "SUCCESS"; // PENDING, SUCCESS, FAILED, REFUNDED

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonIgnore]
    public User? CustomerDetails { get; set; }

    [BsonIgnore]
    public User? FarmerDetails { get; set; }

    [BsonIgnore]
    public Bill? BillDetails { get; set; }
}
