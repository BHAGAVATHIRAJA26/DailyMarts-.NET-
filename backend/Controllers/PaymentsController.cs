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
[Route("api/payments")]
[Route("payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly MongoDbContext _db;

    public PaymentsController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> RecordUpiPayment([FromBody] RecordPaymentRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        if (request.Amount <= 0)
        {
            return BadRequest(ApiResponse<object>.Fail(400, "Valid payment amount is required"));
        }

        Bill? bill = null;

        if (!string.IsNullOrWhiteSpace(request.BillId) && request.BillId != "undefined" && request.BillId != "null")
        {
            var isObjectId = ObjectId.TryParse(request.BillId, out _);
            var billFilter = isObjectId
                ? Builders<Bill>.Filter.And(
                    Builders<Bill>.Filter.Or(
                        Builders<Bill>.Filter.Eq(b => b.Id, request.BillId),
                        Builders<Bill>.Filter.Eq(b => b.BillId, request.BillId),
                        Builders<Bill>.Filter.Eq(b => b.InvoiceNo, request.BillId)),
                    Builders<Bill>.Filter.Eq(b => b.Customer, userId))
                : Builders<Bill>.Filter.And(
                    Builders<Bill>.Filter.Or(
                        Builders<Bill>.Filter.Eq(b => b.BillId, request.BillId),
                        Builders<Bill>.Filter.Eq(b => b.InvoiceNo, request.BillId)),
                    Builders<Bill>.Filter.Eq(b => b.Customer, userId));

            bill = await _db.Bills.Find(billFilter).FirstOrDefaultAsync();
        }

        // Fallback: Find most recent pending bill for this customer
        if (bill == null)
        {
            bill = await _db.Bills
                .Find(b => b.Customer == userId && b.RemainingAmount > 0)
                .SortByDescending(b => b.CreatedAt)
                .FirstOrDefaultAsync();
        }

        if (bill == null)
        {
            return NotFound(ApiResponse<object>.Fail(404, "No pending bill found. Please ask your farmer to generate a bill first."));
        }

        if (request.Amount > bill.RemainingAmount)
        {
            return BadRequest(ApiResponse<object>.Fail(400, $"Payment amount ₹{request.Amount} exceeds remaining bill amount ₹{bill.RemainingAmount}"));
        }

        var farmer = await _db.Users.Find(u => u.Id == bill.Farmer).FirstOrDefaultAsync();
        if (farmer == null) return BadRequest(ApiResponse<object>.Fail(400, "Bill has no associated farmer"));

        var customer = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();

        var paymentId = IdGenerator.GeneratePaymentId();
        var payment = new Payment
        {
            PaymentId = paymentId,
            TransactionId = $"UPI-PENDING-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Customer = userId,
            Farmer = farmer.Id,
            Bill = bill.Id,
            Amount = request.Amount,
            PaymentMethod = "UPI",
            Status = "PENDING"
        };

        await _db.Payments.InsertOneAsync(payment);

        // Notify Farmer
        var notification = new Notification
        {
            Recipient = farmer.Id,
            Sender = userId,
            Type = "PAYMENT_RECEIVED",
            Title = "💰 UPI Payment Pending Confirmation",
            Message = $"{customer?.Name ?? "Customer"} recorded ₹{request.Amount} payment via UPI for Invoice #{bill.InvoiceNo}. Please confirm receipt.",
            Icon = "💰",
            RelatedEntityId = payment.PaymentId
        };
        await _db.Notifications.InsertOneAsync(notification);

        return StatusCode(201, ApiResponse<object>.Ok(201, "Payment recorded. Awaiting farmer confirmation.", new
        {
            payment,
            farmerUpiId = farmer.UpiId,
            billSummary = new
            {
                invoiceNo = bill.InvoiceNo,
                totalAmount = bill.TotalAmount,
                paidAmount = bill.PaidAmount,
                remainingAmount = bill.RemainingAmount,
                paymentStatus = bill.PaymentStatus
            }
        }));
    }

    [HttpPatch("{paymentId}/confirm")]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> ConfirmPaymentReceived(string paymentId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(paymentId, out _);
        var filter = isObjectId
            ? Builders<Payment>.Filter.Or(
                Builders<Payment>.Filter.Eq(p => p.Id, paymentId),
                Builders<Payment>.Filter.Eq(p => p.PaymentId, paymentId))
            : Builders<Payment>.Filter.Eq(p => p.PaymentId, paymentId);

        var payment = await _db.Payments.Find(filter).FirstOrDefaultAsync();
        if (payment == null) return NotFound(ApiResponse<object>.Fail(404, "Payment record not found"));

        if (payment.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to confirm this payment"));
        }

        if (payment.Status == "SUCCESS")
        {
            return BadRequest(ApiResponse<object>.Fail(400, "Payment already confirmed"));
        }

        var bill = await _db.Bills.Find(b => b.Id == payment.Bill).FirstOrDefaultAsync();
        if (bill != null)
        {
            bill.PaidAmount += payment.Amount;
            bill.RemainingAmount = Math.Max(0, bill.TotalAmount - bill.PaidAmount);
            bill.PaymentStatus = bill.RemainingAmount == 0 ? "PAID" : "PARTIALLY_PAID";
            bill.UpdatedAt = DateTime.UtcNow;

            await _db.Bills.ReplaceOneAsync(b => b.Id == bill.Id, bill);

            // Update order payment status
            var orderUpdate = Builders<Order>.Update.Set(o => o.PaymentStatus, bill.PaymentStatus);
            await _db.Orders.UpdateManyAsync(o => o.Customer == payment.Customer && o.Farmer == userId, orderUpdate);
        }

        var farmer = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (farmer != null)
        {
            farmer.WalletBalance += payment.Amount;
            farmer.UpdatedAt = DateTime.UtcNow;
            await _db.Users.ReplaceOneAsync(u => u.Id == farmer.Id, farmer);
        }

        payment.Status = "SUCCESS";
        payment.TransactionId = $"UPI-CONFIRMED-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        payment.UpdatedAt = DateTime.UtcNow;

        await _db.Payments.ReplaceOneAsync(p => p.Id == payment.Id, payment);

        // Notify Customer
        var notification = new Notification
        {
            Recipient = payment.Customer,
            Sender = userId,
            Type = "PAYMENT_RECEIVED",
            Title = "✅ Payment Confirmed by Farmer",
            Message = $"Farmer {farmer?.Name ?? "Farmer"} confirmed receipt of ₹{payment.Amount}. Your bill balance has been updated.",
            Icon = "✅",
            RelatedEntityId = payment.PaymentId
        };
        await _db.Notifications.InsertOneAsync(notification);

        return Ok(ApiResponse<object>.Ok(200, "Payment confirmed. Bill balance updated.", new
        {
            payment,
            farmerWalletBalance = farmer?.WalletBalance ?? 0,
            billSummary = bill != null ? new
            {
                invoiceNo = bill.InvoiceNo,
                totalAmount = bill.TotalAmount,
                paidAmount = bill.PaidAmount,
                remainingAmount = bill.RemainingAmount,
                paymentStatus = bill.PaymentStatus
            } : null
        }));
    }

    [HttpGet("pending")]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> GetPendingPayments()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var payments = await _db.Payments
            .Find(p => p.Farmer == userId && p.Status == "PENDING")
            .SortByDescending(p => p.CreatedAt)
            .ToListAsync();

        var customerIds = payments.Select(p => p.Customer).Distinct().ToList();
        var billIds = payments.Select(p => p.Bill).Distinct().ToList();

        var customers = await _db.Users.Find(u => customerIds.Contains(u.Id)).ToListAsync();
        var bills = await _db.Bills.Find(b => billIds.Contains(b.Id)).ToListAsync();

        var customerMap = customers.ToDictionary(u => u.Id);
        var billMap = bills.ToDictionary(b => b.Id);

        foreach (var p in payments)
        {
            if (customerMap.TryGetValue(p.Customer, out var cust)) p.CustomerDetails = cust;
            if (billMap.TryGetValue(p.Bill, out var b)) p.BillDetails = b;
        }

        return Ok(ApiResponse<List<Payment>>.Ok(200, $"Found {payments.Count} pending payments", payments));
    }

    [HttpGet("farmer-upi/{farmerId}")]
    public async Task<IActionResult> GetFarmerUpi(string farmerId)
    {
        if (string.IsNullOrWhiteSpace(farmerId) || farmerId == "null" || farmerId == "undefined")
        {
            return NotFound(ApiResponse<object>.Fail(404, "Farmer not found"));
        }

        var isObjectId = ObjectId.TryParse(farmerId, out _);
        if (!isObjectId) return NotFound(ApiResponse<object>.Fail(404, "Invalid farmer ID format"));

        var farmer = await _db.Users.Find(u => u.Id == farmerId && u.Role == "FARMER").FirstOrDefaultAsync();
        if (farmer == null) return NotFound(ApiResponse<object>.Fail(404, "Farmer not found"));

        if (string.IsNullOrWhiteSpace(farmer.UpiId))
        {
            return NotFound(ApiResponse<object>.Fail(404, "This farmer has not set up a UPI ID yet"));
        }

        return Ok(ApiResponse<object>.Ok(200, "Farmer UPI fetched", new
        {
            farmerName = !string.IsNullOrWhiteSpace(farmer.FarmName) ? farmer.FarmName : farmer.Name,
            upiId = farmer.UpiId
        }));
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetPaymentHistory()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "CUSTOMER";

        var filter = userRole == "FARMER"
            ? Builders<Payment>.Filter.Eq(p => p.Farmer, userId)
            : Builders<Payment>.Filter.Eq(p => p.Customer, userId);

        var payments = await _db.Payments.Find(filter).SortByDescending(p => p.CreatedAt).ToListAsync();

        var customerIds = payments.Select(p => p.Customer).Distinct().ToList();
        var farmerIds = payments.Select(p => p.Farmer).Distinct().ToList();
        var billIds = payments.Select(p => p.Bill).Distinct().ToList();

        var users = await _db.Users.Find(u => customerIds.Concat(farmerIds).Contains(u.Id)).ToListAsync();
        var bills = await _db.Bills.Find(b => billIds.Contains(b.Id)).ToListAsync();

        var userMap = users.ToDictionary(u => u.Id);
        var billMap = bills.ToDictionary(b => b.Id);

        foreach (var p in payments)
        {
            if (userMap.TryGetValue(p.Customer, out var cust)) p.CustomerDetails = cust;
            if (userMap.TryGetValue(p.Farmer, out var farmer)) p.FarmerDetails = farmer;
            if (billMap.TryGetValue(p.Bill, out var b)) p.BillDetails = b;
        }

        return Ok(ApiResponse<List<Payment>>.Ok(200, $"Found {payments.Count} payments", payments));
    }
}
