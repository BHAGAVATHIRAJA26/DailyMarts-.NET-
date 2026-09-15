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
[Route("api/cancellations")]
[Route("cancellations")]
[Authorize]
public class CancellationsController : ControllerBase
{
    private readonly MongoDbContext _db;

    public CancellationsController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> CreateCancellation([FromBody] CreateCancellationRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        var reason = !string.IsNullOrWhiteSpace(request.Reason) ? request.Reason.Trim() : "Customer cancellation request";
        var type = !string.IsNullOrWhiteSpace(request.CancellationType) ? request.CancellationType.ToUpper().Trim() : "SINGLE_DAY";

        Subscription? sub = null;
        Order? ord = null;

        if (!string.IsNullOrWhiteSpace(request.SubscriptionId))
        {
            var isSubObjId = ObjectId.TryParse(request.SubscriptionId, out _);
            var subFilter = isSubObjId
                ? Builders<Subscription>.Filter.Or(
                    Builders<Subscription>.Filter.Eq(s => s.Id, request.SubscriptionId),
                    Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, request.SubscriptionId))
                : Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, request.SubscriptionId);

            sub = await _db.Subscriptions.Find(subFilter).FirstOrDefaultAsync();
        }
        else if (!string.IsNullOrWhiteSpace(request.OrderId))
        {
            var isOrdObjId = ObjectId.TryParse(request.OrderId, out _);
            var ordFilter = isOrdObjId
                ? Builders<Order>.Filter.Or(
                    Builders<Order>.Filter.Eq(o => o.Id, request.OrderId),
                    Builders<Order>.Filter.Eq(o => o.OrderId, request.OrderId))
                : Builders<Order>.Filter.Eq(o => o.OrderId, request.OrderId);

            ord = await _db.Orders.Find(ordFilter).FirstOrDefaultAsync();
        }

        var cancellation = new Cancellation
        {
            Customer = userId,
            Subscription = sub?.Id,
            Order = ord?.Id,
            CancellationType = type,
            SkipDate = request.SkipDate ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Reason = reason,
            Status = "APPROVED"
        };

        await _db.Cancellations.InsertOneAsync(cancellation);

        if (ord != null)
        {
            ord.OrderStatus = "CANCELLED";
            ord.UpdatedAt = DateTime.UtcNow;
            await _db.Orders.ReplaceOneAsync(o => o.Id == ord.Id, ord);
        }
        else if (sub != null)
        {
            if (type == "FULL_SUBSCRIPTION")
            {
                sub.Status = "CANCELLED";
                sub.UpdatedAt = DateTime.UtcNow;
                await _db.Subscriptions.ReplaceOneAsync(s => s.Id == sub.Id, sub);
            }

            var targetSkipDate = request.SkipDate ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
            var deliveryUpdate = Builders<Delivery>.Update
                .Set(d => d.Status, "SKIPPED")
                .Set(d => d.DeliveredQuantity, 0)
                .Set(d => d.TotalCost, 0);

            await _db.Deliveries.UpdateManyAsync(d => d.Subscription == sub.Id && d.Date == targetSkipDate, deliveryUpdate);
        }

        var recipientId = ord?.Farmer ?? sub?.Farmer;
        if (!string.IsNullOrEmpty(recipientId))
        {
            var customer = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();

            var notification = new Notification
            {
                Recipient = recipientId,
                Sender = userId,
                Type = "ORDER_CANCELLED",
                Title = "❌ Product Delivery Cancelled",
                Message = $"{customer?.Name ?? "Customer"} cancelled/skipped delivery. Reason: {reason}",
                Icon = "❌"
            };
            await _db.Notifications.InsertOneAsync(notification);
        }

        return StatusCode(201, ApiResponse<Cancellation>.Ok(201, "Cancellation processed successfully", cancellation));
    }
}
