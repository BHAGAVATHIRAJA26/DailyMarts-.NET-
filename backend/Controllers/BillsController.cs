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
[Route("api/bills")]
[Route("bills")]
[Authorize]
public class BillsController : ControllerBase
{
    private readonly MongoDbContext _db;

    public BillsController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetBills([FromQuery] string? status)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "CUSTOMER";

        var filterBuilder = Builders<Bill>.Filter;
        var filter = userRole == "FARMER"
            ? filterBuilder.Eq(b => b.Farmer, userId)
            : filterBuilder.Eq(b => b.Customer, userId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            filter = filterBuilder.And(filter, filterBuilder.Eq(b => b.PaymentStatus, status.ToUpper().Trim()));
        }

        var bills = await _db.Bills.Find(filter).SortByDescending(b => b.CreatedAt).ToListAsync();

        var userIds = bills.Select(b => b.Customer).Concat(bills.Select(b => b.Farmer)).Distinct().ToList();
        var users = await _db.Users.Find(u => userIds.Contains(u.Id)).ToListAsync();
        var userMap = users.ToDictionary(u => u.Id);

        foreach (var bill in bills)
        {
            if (userMap.TryGetValue(bill.Customer, out var cust)) bill.CustomerDetails = cust;
            if (userMap.TryGetValue(bill.Farmer, out var farmer)) bill.FarmerDetails = farmer;
        }

        return Ok(ApiResponse<List<Bill>>.Ok(200, $"Found {bills.Count} bills", bills));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBillById(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Bill>.Filter.Or(
                Builders<Bill>.Filter.Eq(b => b.Id, id),
                Builders<Bill>.Filter.Eq(b => b.BillId, id),
                Builders<Bill>.Filter.Eq(b => b.InvoiceNo, id))
            : Builders<Bill>.Filter.Or(
                Builders<Bill>.Filter.Eq(b => b.BillId, id),
                Builders<Bill>.Filter.Eq(b => b.InvoiceNo, id));

        var bill = await _db.Bills.Find(filter).FirstOrDefaultAsync();
        if (bill == null) return NotFound(ApiResponse<object>.Fail(404, "Bill not found"));

        if (bill.Customer != userId && bill.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to view this bill"));
        }

        bill.CustomerDetails = await _db.Users.Find(u => u.Id == bill.Customer).FirstOrDefaultAsync();
        bill.FarmerDetails = await _db.Users.Find(u => u.Id == bill.Farmer).FirstOrDefaultAsync();

        return Ok(ApiResponse<Bill>.Ok(200, "Bill fetched", bill));
    }

    [HttpPost("generate")]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> GenerateBill([FromBody] GenerateBillRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(request.SubscriptionId))
        {
            return BadRequest(ApiResponse<object>.Fail(400, "subscriptionId is required"));
        }

        var isObjectId = ObjectId.TryParse(request.SubscriptionId, out _);
        var subFilter = isObjectId
            ? Builders<Subscription>.Filter.Or(
                Builders<Subscription>.Filter.Eq(s => s.Id, request.SubscriptionId),
                Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, request.SubscriptionId))
            : Builders<Subscription>.Filter.Eq(s => s.SubscriptionId, request.SubscriptionId);

        var sub = await _db.Subscriptions.Find(subFilter).FirstOrDefaultAsync();
        if (sub == null) return NotFound(ApiResponse<object>.Fail(404, "Subscription not found"));

        if (sub.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to generate bill for this subscription"));
        }

        var product = await _db.Products.Find(p => p.Id == sub.Product).FirstOrDefaultAsync();

        var deliveries = await _db.Deliveries
            .Find(d => d.Subscription == sub.Id && d.Status == "DELIVERED")
            .ToListAsync();

        var totalDeliveredQty = deliveries.Sum(d => d.DeliveredQuantity);
        var subtotal = (decimal)totalDeliveredQty * sub.PricePerUnit;

        var now = DateTime.UtcNow;
        var billingPeriod = !string.IsNullOrWhiteSpace(request.Period)
            ? request.Period
            : now.ToString("MMMM yyyy");

        var ids = IdGenerator.GenerateBillIds();
        var dueDate = new DateTime(now.Year, now.Month, Math.Min(28, DateTime.DaysInMonth(now.Year, now.Month))).ToString("yyyy-MM-dd");

        var bill = new Bill
        {
            BillId = ids.BillId,
            InvoiceNo = ids.InvoiceNo,
            Customer = !string.IsNullOrWhiteSpace(request.CustomerId) ? request.CustomerId : sub.Customer,
            Farmer = userId!,
            Subscription = sub.Id,
            BillingPeriod = billingPeriod,
            StartDate = sub.StartDate,
            EndDate = now.ToString("yyyy-MM-dd"),
            ProductName = product?.Name ?? "Organic Milk",
            TotalDeliveredQuantity = totalDeliveredQty,
            Unit = sub.Unit,
            PricePerUnit = sub.PricePerUnit,
            Subtotal = subtotal,
            Discount = 0,
            TotalAmount = subtotal,
            PaidAmount = 0,
            RemainingAmount = subtotal,
            PaymentStatus = "PENDING",
            DueDate = dueDate
        };

        await _db.Bills.InsertOneAsync(bill);

        // Notify Customer
        var notification = new Notification
        {
            Recipient = sub.Customer,
            Sender = userId,
            Type = "BILL_GENERATED",
            Title = "📄 New Monthly Bill Generated",
            Message = $"Your bill for {bill.ProductName} ({billingPeriod}) is ₹{subtotal}. Due by {dueDate}.",
            Icon = "📄",
            RelatedEntityId = bill.InvoiceNo
        };
        await _db.Notifications.InsertOneAsync(notification);

        return StatusCode(201, ApiResponse<Bill>.Ok(201, "Monthly bill generated successfully", bill));
    }
}
