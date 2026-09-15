using DailyMarts.Api.Data;
using DailyMarts.Api.DTOs;
using DailyMarts.Api.Helpers;
using DailyMarts.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace DailyMarts.Api.Controllers;

[ApiController]
[Route("api/inventory")]
[Route("inventory")]
public class InventoryController : ControllerBase
{
    private readonly MongoDbContext _db;

    public InventoryController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetDailyInventory(
        [FromQuery] string? farmerId,
        [FromQuery] string? productId,
        [FromQuery] string? date)
    {
        var targetDate = !string.IsNullOrWhiteSpace(date) ? date : DateTime.UtcNow.ToString("yyyy-MM-dd");

        var filterBuilder = Builders<DailyInventory>.Filter;
        var filter = filterBuilder.Eq(i => i.Date, targetDate);

        if (!string.IsNullOrWhiteSpace(farmerId))
        {
            filter = filterBuilder.And(filter, filterBuilder.Eq(i => i.Farmer, farmerId));
        }

        if (!string.IsNullOrWhiteSpace(productId))
        {
            filter = filterBuilder.And(filter, filterBuilder.Eq(i => i.ProductId, productId));
        }

        var inventories = await _db.DailyInventories.Find(filter).ToListAsync();

        var productIds = inventories.Select(i => i.Product).Distinct().ToList();
        var farmerIds = inventories.Select(i => i.Farmer).Distinct().ToList();

        var products = await _db.Products.Find(p => productIds.Contains(p.Id)).ToListAsync();
        var farmers = await _db.Users.Find(u => farmerIds.Contains(u.Id)).ToListAsync();

        var productMap = products.ToDictionary(p => p.Id);
        var farmerMap = farmers.ToDictionary(u => u.Id);

        foreach (var inv in inventories)
        {
            if (productMap.TryGetValue(inv.Product, out var prod)) inv.ProductDetails = prod;
            if (farmerMap.TryGetValue(inv.Farmer, out var farmer)) inv.FarmerDetails = farmer;
        }

        return Ok(ApiResponse<List<DailyInventory>>.Ok(200, $"Inventories for {targetDate}", inventories));
    }

    [HttpPost("update")]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> UpdateDailyCapacity([FromBody] UpdateCapacityRequest request)
    {
        var productController = new ProductsController(_db);
        return await productController.UpdateCapacity(request.ProductId ?? string.Empty, request);
    }
}
