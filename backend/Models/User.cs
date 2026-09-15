using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

[BsonIgnoreExtraElements]
public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;

    [BsonElement("password")]
    public string Password { get; set; } = string.Empty;

    [BsonElement("role")]
    public string Role { get; set; } = "CUSTOMER"; // CUSTOMER | FARMER

    // Farmer specific fields
    [BsonElement("farmName")]
    public string? FarmName { get; set; }

    [BsonElement("categories")]
    public List<string> Categories { get; set; } = new List<string>();

    [BsonElement("dairyCowsCount")]
    public int DairyCowsCount { get; set; } = 0;

    [BsonElement("dailyYieldEstimate")]
    public string? DailyYieldEstimate { get; set; }

    [BsonElement("isPurityCertified")]
    public bool IsPurityCertified { get; set; } = true;

    [BsonElement("isVerified")]
    public bool IsVerified { get; set; } = true;

    [BsonElement("upiId")]
    public string? UpiId { get; set; }

    [BsonElement("walletBalance")]
    public decimal WalletBalance { get; set; } = 0;

    // Location fields
    [BsonElement("address")]
    public string Address { get; set; } = "Main Road";

    [BsonElement("city")]
    public string City { get; set; } = "Dindigul";

    [BsonElement("district")]
    public string District { get; set; } = "Dindigul";

    [BsonElement("state")]
    public string State { get; set; } = "Tamil Nadu";

    [BsonElement("pincode")]
    public string Pincode { get; set; } = "624001";

    [BsonElement("location")]
    public LocationPoint Location { get; set; } = new LocationPoint();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
