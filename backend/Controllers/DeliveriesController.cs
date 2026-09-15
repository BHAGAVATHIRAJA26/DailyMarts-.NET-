using System.Security.Claims;
using DailyMarts.Api.Data;
using DailyMarts.Api.Helpers;
using DailyMarts.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace DailyMarts.Api.Controllers;

[ApiController]
[Route("api/deliveries")]
[Route("deliveries")]
[Authorize]
public class DeliveriesController : ControllerBase
{
    private readonly MongoDbContext _db;

    public DeliveriesController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetDeliveries([FromQuery] string? date, [FromQuery] string? status)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "CUSTOMER";

        var filterBuilder = Builders<Delivery>.Filter;
        var filter = userRole == "FARMER"
            ? filterBuilder.Eq(d => d.Farmer, userId)
            : filterBuilder.Eq(d => d.Customer, userId);

        if (!string.IsNullOrWhiteSpace(date))
        {
            filter = filterBuilder.And(filter, filterBuilder.Eq(d => d.Date, date));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            filter = filterBuilder.And(filter, filterBuilder.Eq(d => d.Status, status.ToUpper().Trim()));
        }

        var deliveries = await _db.Deliveries.Find(filter).SortByDescending(d => d.Date).ToListAsync();

        var productIds = deliveries.Select(d => d.Product).Distinct().ToList();
        var userIds = deliveries.Select(d => d.Customer).Concat(deliveries.Select(d => d.Farmer)).Distinct().ToList();

        var products = await _db.Products.Find(p => productIds.Contains(p.Id)).ToListAsync();
        var users = await _db.Users.Find(u => userIds.Contains(u.Id)).ToListAsync();

        var productMap = products.ToDictionary(p => p.Id);
        var userMap = users.ToDictionary(u => u.Id);

        foreach (var del in deliveries)
        {
            if (productMap.TryGetValue(del.Product, out var prod)) del.ProductDetails = prod;
            if (userMap.TryGetValue(del.Customer, out var cust)) del.CustomerDetails = cust;
            if (userMap.TryGetValue(del.Farmer, out var farmer)) del.FarmerDetails = farmer;
        }

        return Ok(ApiResponse<List<Delivery>>.Ok(200, $"Found {deliveries.Count} delivery records", deliveries));
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateDeliveryStatus(string id, [FromBody] Dictionary<string, object> body)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var delivery = isObjectId ? await _db.Deliveries.Find(d => d.Id == id).FirstOrDefaultAsync() : null;

        if (delivery == null)
        {
            // Check if ID is order ID
            var order = isObjectId ? await _db.Orders.Find(o => o.Id == id).FirstOrDefaultAsync() : null;
            if (order != null)
            {
                order.OrderStatus = "SUPPLIED";
                order.UpdatedAt = DateTime.UtcNow;
                await _db.Orders.ReplaceOneAsync(o => o.Id == order.Id, order);
                return Ok(ApiResponse<Order>.Ok(200, "Order marked as supplied", order));
            }
            return NotFound(ApiResponse<object>.Fail(404, "Delivery record not found"));
        }

        if (delivery.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to update this delivery record"));
        }

        if (body.TryGetValue("status", out var statusObj) && statusObj != null)
        {
            delivery.Status = statusObj.ToString()!.ToUpper().Trim();
        }

        if (body.TryGetValue("deliveredQuantity", out var qtyObj) && qtyObj != null)
        {
            if (double.TryParse(qtyObj.ToString(), out var qty))
            {
                delivery.DeliveredQuantity = qty;
                delivery.TotalCost = (decimal)qty * delivery.PricePerUnit;
            }
        }

        delivery.UpdatedAt = DateTime.UtcNow;
        await _db.Deliveries.ReplaceOneAsync(d => d.Id == delivery.Id, delivery);

        return Ok(ApiResponse<Delivery>.Ok(200, "Delivery status updated successfully", delivery));
    }
}
