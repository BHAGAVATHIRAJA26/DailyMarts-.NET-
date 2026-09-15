using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class Bill
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("billId")]
    public string BillId { get; set; } = string.Empty;

    [BsonElement("invoiceNo")]
    public string InvoiceNo { get; set; } = string.Empty;

    [BsonElement("customer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Customer { get; set; } = string.Empty;

    [BsonElement("farmer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Farmer { get; set; } = string.Empty;

    [BsonElement("subscription")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Subscription { get; set; }

    [BsonElement("billingPeriod")]
    public string BillingPeriod { get; set; } = string.Empty;

    [BsonElement("startDate")]
    public string StartDate { get; set; } = string.Empty;

    [BsonElement("endDate")]
    public string EndDate { get; set; } = string.Empty;

    [BsonElement("productName")]
    public string ProductName { get; set; } = string.Empty;

    [BsonElement("totalDeliveredQuantity")]
    public double TotalDeliveredQuantity { get; set; }

    [BsonElement("unit")]
    public string Unit { get; set; } = "L";

    [BsonElement("pricePerUnit")]
    public decimal PricePerUnit { get; set; }

    [BsonElement("subtotal")]
    public decimal Subtotal { get; set; }

    [BsonElement("discount")]
    public decimal Discount { get; set; } = 0;

    [BsonElement("totalAmount")]
    public decimal TotalAmount { get; set; }

    [BsonElement("paidAmount")]
    public decimal PaidAmount { get; set; } = 0;

    [BsonElement("remainingAmount")]
    public decimal RemainingAmount { get; set; }

    [BsonElement("paymentStatus")]
    public string PaymentStatus { get; set; } = "PENDING"; // PAID, PARTIALLY_PAID, PENDING, OVERDUE

    [BsonElement("dueDate")]
    public string DueDate { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonIgnore]
    public User? CustomerDetails { get; set; }

    [BsonIgnore]
    public User? FarmerDetails { get; set; }
}
