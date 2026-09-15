using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class Notification
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("recipient")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Recipient { get; set; } = string.Empty;

    [BsonElement("sender")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Sender { get; set; }

    [BsonElement("type")]
    public string Type { get; set; } = "ORDER_CREATED";

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("message")]
    public string Message { get; set; } = string.Empty;

    [BsonElement("icon")]
    public string Icon { get; set; } = "🔔";

    [BsonElement("isRead")]
    public bool IsRead { get; set; } = false;

    [BsonElement("relatedEntityId")]
    public string? RelatedEntityId { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
