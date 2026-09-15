using MongoDB.Bson.Serialization.Attributes;

namespace DailyMarts.Api.Models;

public class LocationPoint
{
    [BsonElement("type")]
    public string Type { get; set; } = "Point";

    [BsonElement("coordinates")]
    public double[] Coordinates { get; set; } = new double[] { 77.9803, 10.3673 }; // [Longitude, Latitude]
}
