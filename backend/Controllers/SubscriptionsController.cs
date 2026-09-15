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
[Route("api/subscriptions")]
[Route("subscriptions")]
[Authorize]
public class SubscriptionsController : ControllerBase
{
    private readonly MongoDbContext _db;

    public SubscriptionsController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> CreateSubscription([FromBody] CreateSubscriptionRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        if (string.IsNullOrWhiteSpace(request.ProductId))
        {
            return BadRequest(ApiResponse<object>.Fail(400, "productId is required"));
        }

        var isObjectId = ObjectId.TryParse(request.ProductId, out _);
        var productFilter = isObjectId
            ? Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Eq(p => p.Id, request.ProductId),
                Builders<Product>.Filter.Eq(p => p.ProductId, request.ProductId))
            : Builders<Product>.Filter.Eq(p => p.ProductId, request.ProductId);

        var product = await _db.Products.Find(productFilter).FirstOrDefaultAsync();
        if (product == null) return NotFound(ApiResponse<object>.Fail(404, "Product not found"));

        if (product.Status == "INACTIVE")
        {
            return BadRequest(ApiResponse<object>.Fail(400, "This product is currently unavailable"));
        }

        var customer = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (customer == null) return NotFound(ApiResponse<object>.Fail(404, "Customer user not found"));

        var qty = Math.Max(1, request.Quantity);
        var days = Math.Max(1, request.DurationDays ?? 30);
        var freq = !string.IsNullOrWhiteSpace(request.Frequency) ? request.Frequency.ToUpper().Trim() : "DAILY";
        var slot = !string.IsNullOrWhiteSpace(request.DeliverySlot) ? request.DeliverySlot.ToUpper().Trim() : "MORNING";

        var multiplier = freq switch
        {
            "DAILY" => days,
            "WEEKLY" => (int)Math.Ceiling((double)days / 7),
            "ALTERNATE" => (int)Math.Ceiling((double)days / 2),
            _ => 1
        };

        var estimatedMonthlyAmount = product.Price * (decimal)qty * multiplier;
        var subId = IdGenerator.GenerateSubscriptionId();

        var subscription = new Subscription
        {
            SubscriptionId = subId,
            Customer = customer.Id,
            Farmer = !string.IsNullOrWhiteSpace(request.FarmerId) ? request.FarmerId : product.Farmer,
            Product = product.Id,
            Quantity = qty,
            Unit = product.Unit,
            Frequency = freq,
            DeliverySlot = slot,
            StartDate = !string.IsNullOrWhiteSpace(request.StartDate) ? request.StartDate : DateTime.UtcNow.ToString("yyyy-MM-dd"),
            DurationDays = days,
            PricePerUnit = product.Price,
            EstimatedMonthlyAmount = estimatedMonthlyAmount,
            Status = "ACTIVE"
        };

        await _db.Subscriptions.InsertOneAsync(subscription);

        // Generate first delivery record for today
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var existingDelivery = await _db.Deliveries
            .Find(d => d.Customer == customer.Id && d.Product == product.Id && d.Date == today)
            .FirstOrDefaultAsync();

        if (existingDelivery == null)
        {
            var delivery = new Delivery
            {
                Subscription = subscription.Id,
                Customer = customer.Id,
                Farmer = subscription.Farmer,
                Product = product.Id,
                Date = today,
                DeliverySlot = slot,
                RequestedQuantity = qty,
                DeliveredQuantity = qty,
                Unit = product.Unit,
                PricePerUnit = product.Price,
                TotalCost = (decimal)qty * product.Price,
                Status = "PENDING"
            };

            await _db.Deliveries.InsertOneAsync(delivery);
        }

        // Notify Farmer
        var notification = new Notification
        {
            Recipient = subscription.Farmer,
            Sender = customer.Id,
            Type = "ORDER_CREATED",
            Title = "🥛 New Milk Subscription",
            Message = $"{customer.Name} subscribed to {qty} {product.Unit} {product.Name} ({freq}, {slot}).",
            Icon = "🥛",
            RelatedEntityId = subscription.SubscriptionId
        };
        await _db.Notifications.InsertOneAsync(notification);

        return StatusCode(201, ApiResponse<Subscription>.Ok(201, "Recurring subscription created successfully", subscription));
    }

    [HttpGet]
    public async Task<IActionResult> GetSubscriptions([FromQuery] string? status)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "CUSTOMER";

        var filterBuilder = Builders<Subscription>.Filter;
        var filter = userRole == "FARMER"
            ? filterBuilder.Eq(s => s.Farmer, userId)
            : filterBuilder.Eq(s => s.Customer, userId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            filter = filterBuilder.And(filter, filterBuilder.Eq(s => s.Status, status.ToUpper().Trim()));
        }

        var subscriptions = await _db.Subscriptions.Find(filter).SortByDescending(s => s.CreatedAt).ToListAsync();

        var productIds = subscriptions.Select(s => s.Product).Distinct().ToList();
        var userIds = subscriptions.Select(s => s.Customer).Concat(subscriptions.Select(s => s.Farmer)).Distinct().ToList();

        var products = await _db.Products.Find(p => productIds.Contains(p.Id)).ToListAsync();
        var users = await _db.Users.Find(u => userIds.Contains(u.Id)).ToListAsync();

        var productMap = products.ToDictionary(p => p.Id);
        var userMap = users.ToDictionary(u => u.Id);

        foreach (var sub in subscriptions)
        {
            if (productMap.TryGetValue(sub.Product, out var prod)) sub.ProductDetails = prod;
            if (userMap.TryGetValue(sub.Farmer, out var farmer)) sub.FarmerDetails = farmer;
            if (userMap.TryGetValue(sub.Customer, out var cust)) sub.CustomerDetails = cust;
        }

        return Ok(ApiResponse<List<Subscription>>.Ok(200, $"Found {subscriptions.Count} subscriptions", subscriptions));
    }

    [HttpPatch("{id}/pause")]
    [HttpPost("{id}/skip")]
    public async Task<IActionResult> PauseSubscription(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Subscription>.Filter.Or(
                Builders<Subscription>.Filter.Eq(s => s.Id, id),
                Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, id))
            : Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, id);

        var sub = await _db.Subscriptions.Find(filter).FirstOrDefaultAsync();
        if (sub == null) return NotFound(ApiResponse<object>.Fail(404, "Subscription not found"));

        if (sub.Customer != userId && sub.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized"));
        }

        sub.Status = "PAUSED";
        sub.UpdatedAt = DateTime.UtcNow;
        await _db.Subscriptions.ReplaceOneAsync(s => s.Id == sub.Id, sub);

        return Ok(ApiResponse<Subscription>.Ok(200, "Subscription paused", sub));
    }

    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> CancelSubscription(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Subscription>.Filter.Or(
                Builders<Subscription>.Filter.Eq(s => s.Id, id),
                Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, id))
            : Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, id);

        var sub = await _db.Subscriptions.Find(filter).FirstOrDefaultAsync();
        if (sub == null) return NotFound(ApiResponse<object>.Fail(404, "Subscription not found"));

        if (sub.Customer != userId && sub.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized"));
        }

        sub.Status = "CANCELLED";
        sub.UpdatedAt = DateTime.UtcNow;
        await _db.Subscriptions.ReplaceOneAsync(s => s.Id == sub.Id, sub);

        return Ok(ApiResponse<Subscription>.Ok(200, "Subscription cancelled", sub));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSubscription(string id, [FromBody] CreateSubscriptionRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Subscription>.Filter.Or(
                Builders<Subscription>.Filter.Eq(s => s.Id, id),
                Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, id))
            : Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, id);

        var sub = await _db.Subscriptions.Find(filter).FirstOrDefaultAsync();
        if (sub == null) return NotFound(ApiResponse<object>.Fail(404, "Subscription not found"));

        if (sub.Customer != userId && sub.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized"));
        }

        if (request.Quantity > 0) sub.Quantity = request.Quantity;
        if (!string.IsNullOrWhiteSpace(request.Frequency)) sub.Frequency = request.Frequency.ToUpper().Trim();
        if (!string.IsNullOrWhiteSpace(request.DeliverySlot)) sub.DeliverySlot = request.DeliverySlot.ToUpper().Trim();

        sub.UpdatedAt = DateTime.UtcNow;
        await _db.Subscriptions.ReplaceOneAsync(s => s.Id == sub.Id, sub);

        return Ok(ApiResponse<Subscription>.Ok(200, "Subscription updated", sub));
    }
}
