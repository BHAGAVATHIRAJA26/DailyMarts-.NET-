using System.Security.Claims;
using DailyMarts.Api.Data;
using DailyMarts.Api.DTOs;
using DailyMarts.Api.Helpers;
using DailyMarts.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace DailyMarts.Api.Controllers;

[ApiController]
[Route("api/exchanges")]
[Route("exchanges")]
[Authorize(Roles = "FARMER")]
public class ExchangesController : ControllerBase
{
    private readonly MongoDbContext _db;

    public ExchangesController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [HttpGet("requests")]
    public async Task<IActionResult> GetExchangeRequests()
    {
        var exchanges = await _db.ProductExchanges
            .Find(Builders<ProductExchange>.Filter.Empty)
            .SortByDescending(e => e.CreatedAt)
            .ToListAsync();

        var farmerIds = exchanges.Select(e => e.SenderFarmer)
            .Concat(exchanges.Where(e => e.ReceiverFarmer != null).Select(e => e.ReceiverFarmer!))
            .Distinct().ToList();

        var farmers = await _db.Users.Find(u => farmerIds.Contains(u.Id)).ToListAsync();
        var farmerMap = farmers.ToDictionary(u => u.Id);

        foreach (var ex in exchanges)
        {
            if (farmerMap.TryGetValue(ex.SenderFarmer, out var sender)) ex.SenderFarmerDetails = sender;
            if (ex.ReceiverFarmer != null && farmerMap.TryGetValue(ex.ReceiverFarmer, out var receiver)) ex.ReceiverFarmerDetails = receiver;
        }

        return Ok(ApiResponse<List<ProductExchange>>.Ok(200, $"Found {exchanges.Count} exchange requests", exchanges));
    }

    [HttpPost]
    [HttpPost("requests")]
    public async Task<IActionResult> CreateExchangeRequest([FromBody] CreateExchangeRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var farmer = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(request.RequestedProduct))
        {
            return BadRequest(ApiResponse<object>.Fail(400, "Requested product is required"));
        }

        var mode = !string.IsNullOrWhiteSpace(request.ExchangeType) ? request.ExchangeType.ToUpper().Trim() : "SWAP";
        var qty = request.RequiredQuantity > 0 ? request.RequiredQuantity : 1;
        var exchangeId = IdGenerator.GenerateExchangeId();

        var exchange = new ProductExchange
        {
            ExchangeId = exchangeId,
            SenderFarmer = userId!,
            ExchangeType = mode,
            RequestedProduct = request.RequestedProduct.Trim(),
            RequiredQuantity = qty,
            Unit = !string.IsNullOrWhiteSpace(request.Unit) ? request.Unit : "L",
            OfferedProduct = mode == "SWAP" ? request.OfferedProduct : null,
            PricePerUnit = mode == "PAID" ? (request.PricePerUnit ?? (request.OfferedAmount.HasValue ? request.OfferedAmount.Value / (decimal)qty : null)) : null,
            OfferedAmount = mode == "PAID" ? request.OfferedAmount : null,
            Location = farmer?.City ?? "Dindigul",
            Notes = request.Notes,
            Status = "PENDING"
        };

        await _db.ProductExchanges.InsertOneAsync(exchange);

        return StatusCode(201, ApiResponse<ProductExchange>.Ok(201, "Product exchange request published successfully", exchange));
    }

    [HttpPatch("{id}/accept")]
    [HttpPatch("requests/{id}/accept")]
    public async Task<IActionResult> AcceptExchangeRequest(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<ProductExchange>.Filter.Or(
                Builders<ProductExchange>.Filter.Eq(e => e.Id, id),
                Builders<ProductExchange>.Filter.Eq(e => e.ExchangeId, id))
            : Builders<ProductExchange>.Filter.Eq(e => e.ExchangeId, id);

        var exchange = await _db.ProductExchanges.Find(filter).FirstOrDefaultAsync();
        if (exchange == null) return NotFound(ApiResponse<object>.Fail(404, "Exchange request not found"));

        if (exchange.SenderFarmer == userId)
        {
            return BadRequest(ApiResponse<object>.Fail(400, "Cannot accept your own exchange request"));
        }

        var acceptingFarmer = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();

        exchange.ReceiverFarmer = userId;
        exchange.Status = "ACCEPTED";
        exchange.UpdatedAt = DateTime.UtcNow;

        await _db.ProductExchanges.ReplaceOneAsync(e => e.Id == exchange.Id, exchange);

        // Notify Sender Farmer
        var notification = new Notification
        {
            Recipient = exchange.SenderFarmer,
            Sender = userId,
            Type = "EXCHANGE_ACCEPTED",
            Title = "🤝 Exchange Request Accepted",
            Message = $"Farmer {acceptingFarmer?.Name ?? "Farmer"} accepted your {exchange.RequestedProduct} request!",
            Icon = "🤝",
            RelatedEntityId = exchange.ExchangeId
        };
        await _db.Notifications.InsertOneAsync(notification);

        return Ok(ApiResponse<ProductExchange>.Ok(200, "Exchange request accepted successfully", exchange));
    }
}
