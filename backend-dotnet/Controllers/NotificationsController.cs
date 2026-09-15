using System.Security.Claims;
using DailyMarts.Api.Data;
using DailyMarts.Api.DTOs;
using DailyMarts.Api.Helpers;
using DailyMarts.Api.Models;
using DailyMarts.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace DailyMarts.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Route("notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly MongoDbContext _db;
    private readonly IEmailService _emailService;

    public NotificationsController(MongoDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var notifications = await _db.Notifications
            .Find(n => n.Recipient == userId)
            .SortByDescending(n => n.CreatedAt)
            .Limit(30)
            .ToListAsync();

        return Ok(ApiResponse<List<Notification>>.Ok(200, $"Found {notifications.Count} notifications", notifications));
    }

    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkRead(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (id == "read-all")
        {
            var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
            await _db.Notifications.UpdateManyAsync(n => n.Recipient == userId, update);
            return Ok(ApiResponse<object>.Ok(200, "All notifications marked read", null));
        }

        var notif = await _db.Notifications.Find(n => n.Id == id && n.Recipient == userId).FirstOrDefaultAsync();
        if (notif == null) return NotFound(ApiResponse<object>.Fail(404, "Notification not found"));

        notif.IsRead = true;
        notif.UpdatedAt = DateTime.UtcNow;
        await _db.Notifications.ReplaceOneAsync(n => n.Id == notif.Id, notif);

        return Ok(ApiResponse<Notification>.Ok(200, "Notification marked read", notif));
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var update = Builders<Notification>.Update.Set(n => n.IsRead, true);
        await _db.Notifications.UpdateManyAsync(n => n.Recipient == userId, update);

        return Ok(ApiResponse<object>.Ok(200, "All notifications marked read", null));
    }

    [HttpPost("remind/{customerId}")]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> SendPaymentReminder(string customerId)
    {
        var farmerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var farmer = await _db.Users.Find(u => u.Id == farmerId).FirstOrDefaultAsync();
        if (farmer == null) return Unauthorized(ApiResponse<object>.Fail(401, "Farmer not found"));

        var customer = await _db.Users.Find(u => u.Id == customerId).FirstOrDefaultAsync();
        if (customer == null) return NotFound(ApiResponse<object>.Fail(404, "Customer not found"));

        var bill = await _db.Bills
            .Find(b => b.Customer == customer.Id && b.Farmer == farmerId && b.RemainingAmount > 0)
            .FirstOrDefaultAsync();

        var pendingAmount = bill?.RemainingAmount ?? 660;
        var dueDate = bill?.DueDate ?? "2026-08-31";
        var invoiceNo = bill?.InvoiceNo ?? "INV-DM-2026-1001";

        // Prevent spamming reminders in last 2 hours
        var twoHoursAgo = DateTime.UtcNow.AddHours(-2);
        var recentReminder = await _db.Notifications
            .Find(n => n.Recipient == customer.Id && n.Sender == farmerId && n.Type == "PAYMENT_REMINDER" && n.CreatedAt >= twoHoursAgo)
            .FirstOrDefaultAsync();

        if (recentReminder != null)
        {
            return BadRequest(ApiResponse<object>.Fail(400, "A payment reminder was already sent to this customer recently"));
        }

        var notif = new Notification
        {
            Recipient = customer.Id,
            Sender = farmerId,
            Type = "PAYMENT_REMINDER",
            Title = "💳 Payment Reminder",
            Message = $"Farmer {farmer.Name} sent a reminder: ₹{pendingAmount} is pending for your monthly bill. Due by {dueDate}.",
            Icon = "💰",
            RelatedEntityId = invoiceNo
        };
        await _db.Notifications.InsertOneAsync(notif);

        // Send Email via Resend
        _ = _emailService.SendPaymentReminderEmailAsync(farmer, customer, pendingAmount, dueDate, invoiceNo);

        return Ok(ApiResponse<Notification>.Ok(200, $"Payment reminder email sent successfully to {customer.Name}", notif));
    }

    [HttpPost("send-email")]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> SendCustomEmailToCustomer([FromBody] SendCustomEmailRequest request)
    {
        var farmerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var farmer = await _db.Users.Find(u => u.Id == farmerId).FirstOrDefaultAsync();
        if (farmer == null) return Unauthorized(ApiResponse<object>.Fail(401, "Farmer not found"));

        var customer = await _db.Users.Find(u => u.Id == request.CustomerId).FirstOrDefaultAsync();
        if (customer == null) return NotFound(ApiResponse<object>.Fail(404, "Customer not found"));

        var subject = !string.IsNullOrWhiteSpace(request.Subject) ? request.Subject : $"Update from {farmer.FarmName ?? farmer.Name}";
        var message = !string.IsNullOrWhiteSpace(request.Message) ? request.Message : "Your farmer has shared an update regarding product availability/deliveries.";

        _ = _emailService.SendFarmerToCustomerEmailAsync(farmer, customer, subject, message, request.Data);

        var notif = new Notification
        {
            Recipient = customer.Id,
            Sender = farmerId,
            Type = "ANNOUNCEMENT",
            Title = subject,
            Message = message,
            Icon = "📧"
        };
        await _db.Notifications.InsertOneAsync(notif);

        return Ok(ApiResponse<Notification>.Ok(200, $"Email sent to {customer.Name} ({customer.Email})", notif));
    }
}
