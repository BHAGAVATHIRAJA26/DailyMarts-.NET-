using DailyMarts.Api.Data;
using DailyMarts.Api.Helpers;
using DailyMarts.Api.Models;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace DailyMarts.Api.Controllers;

[ApiController]
[Route("api/farmers")]
[Route("farmers")]
public class FarmersController : ControllerBase
{
    private readonly MongoDbContext _db;

    public FarmersController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpGet("nearby")]
    public async Task<IActionResult> GetNearbyFarmers(
        [FromQuery] double? longitude,
        [FromQuery] double? latitude,
        [FromQuery] double? radiusInKm)
    {
        var lng = longitude ?? 77.9803;
        var lat = latitude ?? 10.3673;
        var radius = radiusInKm ?? 15;
        var maxDistanceMeters = radius * 1000;

        try
        {
            var filter = Builders<User>.Filter.And(
                Builders<User>.Filter.Eq(u => u.Role, "FARMER"),
                Builders<User>.Filter.NearPoint(u => u.Location, lng, lat, maxDistanceMeters)
            );

            var nearbyFarmers = await _db.Users.Find(filter).ToListAsync();

            return Ok(ApiResponse<List<User>>.Ok(200, $"Found {nearbyFarmers.Count} nearby farmers within {radius}km", nearbyFarmers));
        }
        catch
        {
            // Fallback if 2dsphere index is still building or unsupported
            var fallbackFarmers = await _db.Users.Find(u => u.Role == "FARMER").ToListAsync();
            return Ok(ApiResponse<List<User>>.Ok(200, $"Found {fallbackFarmers.Count} farmers", fallbackFarmers));
        }
    }
}
