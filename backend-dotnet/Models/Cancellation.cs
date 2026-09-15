using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class Cancellation
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("customer")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Customer { get; set; } = string.Empty;

    [BsonElement("subscription")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Subscription { get; set; }

    [BsonElement("order")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Order { get; set; }

    [BsonElement("cancellationType")]
    public string CancellationType { get; set; } = "SINGLE_DAY"; // SINGLE_DAY, DATE_RANGE, FULL_SUBSCRIPTION

    [BsonElement("skipDate")]
    public string? SkipDate { get; set; }

    [BsonElement("startDate")]
    public string? StartDate { get; set; }

    [BsonElement("endDate")]
    public string? EndDate { get; set; }

    [BsonElement("reason")]
    public string Reason { get; set; } = string.Empty;

    [BsonElement("status")]
    public string Status { get; set; } = "APPROVED"; // PENDING, APPROVED, REJECTED

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
