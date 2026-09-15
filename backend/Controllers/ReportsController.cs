using System.Security.Claims;
using DailyMarts.Api.Data;
using DailyMarts.Api.Helpers;
using DailyMarts.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace DailyMarts.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Route("reports")]
[Authorize(Roles = "FARMER")]
public class ReportsController : ControllerBase
{
    private readonly MongoDbContext _db;

    public ReportsController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpGet("farmer/stats")]
    [HttpGet]
    public async Task<IActionResult> GetFarmerStats()
    {
        var farmerId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(farmerId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        // 1. Today's sales & revenue
        var todayOrders = await _db.Orders
            .Find(o => o.Farmer == farmerId && o.DeliveryDate == today && o.OrderStatus != "CANCELLED")
            .ToListAsync();

        var todaySales = todayOrders.Sum(o => o.Quantity);
        var todayRevenue = todayOrders.Sum(o => o.TotalAmount);

        // 2. All-time revenue & bills
        var allBills = await _db.Bills.Find(b => b.Farmer == farmerId).ToListAsync();
        var monthlyRevenue = allBills.Sum(b => b.TotalAmount);
        var pendingPayments = allBills.Sum(b => b.RemainingAmount);
        var totalPaid = allBills.Sum(b => b.PaidAmount);

        // 3. Active customers count
        var activeSubs = await _db.Subscriptions.Find(s => s.Farmer == farmerId && s.Status == "ACTIVE").ToListAsync();
        var activeCustomersCount = activeSubs.Select(s => s.Customer).Distinct().Count();

        var stats = new
        {
            todaySales = todaySales,
            todayRevenue = todayRevenue,
            monthlyRevenue = monthlyRevenue,
            pendingPayments = pendingPayments,
            totalPaid = totalPaid,
            activeCustomers = activeCustomersCount
        };

        return Ok(ApiResponse<object>.Ok(200, "Farmer statistics calculated", stats));
    }
}
