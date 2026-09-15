using System.Security.Claims;
using DailyMarts.Api.Data;
using DailyMarts.Api.DTOs;
using DailyMarts.Api.Helpers;
using DailyMarts.Api.Models;
using DailyMarts.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace DailyMarts.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Route("orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly MongoDbContext _db;
    private readonly IEmailService _emailService;

    public OrdersController(MongoDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        if (string.IsNullOrWhiteSpace(request.ProductId))
        {
            return BadRequest(ApiResponse<object>.Fail(400, "productId is required"));
        }

        if (request.Quantity <= 0)
        {
            return BadRequest(ApiResponse<object>.Fail(400, "Valid order quantity is required"));
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

        var targetDate = !string.IsNullOrWhiteSpace(request.DeliveryDate)
            ? request.DeliveryDate
            : DateTime.UtcNow.ToString("yyyy-MM-dd");

        // Check & update daily inventory
        var inventory = await _db.DailyInventories
            .Find(i => i.Product == product.Id && i.Date == targetDate)
            .FirstOrDefaultAsync();

        if (inventory == null)
        {
            inventory = new DailyInventory
            {
                Product = product.Id,
                ProductId = product.ProductId,
                Farmer = product.Farmer,
                Date = targetDate,
                AvailableQuantity = 50,
                SoldQuantity = 0,
                RemainingQuantity = 50,
                Unit = product.Unit,
                Price = product.Price,
                Status = "AVAILABLE"
            };
            await _db.DailyInventories.InsertOneAsync(inventory);
        }

        if (request.Quantity > inventory.RemainingQuantity)
        {
            return BadRequest(ApiResponse<object>.Fail(400, $"Insufficient inventory. Requested {request.Quantity} {product.Unit}, only {inventory.RemainingQuantity} {product.Unit} remaining today."));
        }

        inventory.SoldQuantity += request.Quantity;
        inventory.RemainingQuantity = inventory.AvailableQuantity - inventory.SoldQuantity;
        inventory.Status = inventory.RemainingQuantity == 0 ? "SOLD_OUT" : inventory.RemainingQuantity < 5 ? "LIMITED" : "AVAILABLE";
        inventory.UpdatedAt = DateTime.UtcNow;

        await _db.DailyInventories.ReplaceOneAsync(i => i.Id == inventory.Id, inventory);

        var orderId = IdGenerator.GenerateOrderId();
        var totalAmount = (decimal)request.Quantity * product.Price;

        var order = new Order
        {
            OrderId = orderId,
            Customer = customer.Id,
            Farmer = product.Farmer,
            Product = product.Id,
            Quantity = request.Quantity,
            Unit = product.Unit,
            PricePerUnit = product.Price,
            TotalAmount = totalAmount,
            OrderDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            DeliveryDate = targetDate,
            DeliverySlot = !string.IsNullOrWhiteSpace(request.DeliverySlot) ? request.DeliverySlot.ToUpper() : "MORNING",
            OrderStatus = "CONFIRMED",
            PaymentStatus = "PENDING"
        };

        await _db.Orders.InsertOneAsync(order);

        // Notify Farmer
        var notification = new Notification
        {
            Recipient = product.Farmer,
            Sender = customer.Id,
            Type = "ORDER_CREATED",
            Title = "📦 New Customer Order",
            Message = $"{customer.Name} ordered {request.Quantity} {product.Unit} of {product.Name}.",
            Icon = "📦",
            RelatedEntityId = order.OrderId
        };
        await _db.Notifications.InsertOneAsync(notification);

        // Send confirmation email asynchronously
        _ = _emailService.SendOrderConfirmationEmailAsync(customer, order);

        return StatusCode(201, ApiResponse<Order>.Ok(201, "Order created successfully", order));
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders([FromQuery] string? status)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "CUSTOMER";

        var filterBuilder = Builders<Order>.Filter;
        var filter = userRole == "FARMER"
            ? filterBuilder.Eq(o => o.Farmer, userId)
            : filterBuilder.Eq(o => o.Customer, userId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            filter = filterBuilder.And(filter, filterBuilder.Eq(o => o.OrderStatus, status.ToUpper().Trim()));
        }

        var orders = await _db.Orders.Find(filter).SortByDescending(o => o.CreatedAt).ToListAsync();

        // Populate relations
        var productIds = orders.Select(o => o.Product).Distinct().ToList();
        var userIds = orders.Select(o => o.Customer).Concat(orders.Select(o => o.Farmer)).Distinct().ToList();

        var products = await _db.Products.Find(p => productIds.Contains(p.Id)).ToListAsync();
        var users = await _db.Users.Find(u => userIds.Contains(u.Id)).ToListAsync();

        var productMap = products.ToDictionary(p => p.Id);
        var userMap = users.ToDictionary(u => u.Id);

        foreach (var order in orders)
        {
            if (productMap.TryGetValue(order.Product, out var prod)) order.ProductDetails = prod;
            if (userMap.TryGetValue(order.Farmer, out var farmer)) order.FarmerDetails = farmer;
            if (userMap.TryGetValue(order.Customer, out var cust)) order.CustomerDetails = cust;
        }

        return Ok(ApiResponse<List<Order>>.Ok(200, $"Found {orders.Count} orders", orders));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderById(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Order>.Filter.Or(
                Builders<Order>.Filter.Eq(o => o.Id, id),
                Builders<Order>.Filter.Eq(o => o.OrderId, id))
            : Builders<Order>.Filter.Eq(o => o.OrderId, id);

        var order = await _db.Orders.Find(filter).FirstOrDefaultAsync();
        if (order == null) return NotFound(ApiResponse<object>.Fail(404, "Order not found"));

        if (order.Customer != userId && order.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to view this order"));
        }

        order.ProductDetails = await _db.Products.Find(p => p.Id == order.Product).FirstOrDefaultAsync();
        order.FarmerDetails = await _db.Users.Find(u => u.Id == order.Farmer).FirstOrDefaultAsync();
        order.CustomerDetails = await _db.Users.Find(u => u.Id == order.Customer).FirstOrDefaultAsync();

        return Ok(ApiResponse<Order>.Ok(200, "Order details fetched", order));
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string id, [FromBody] UpdateOrderStatusRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Order>.Filter.Or(
                Builders<Order>.Filter.Eq(o => o.Id, id),
                Builders<Order>.Filter.Eq(o => o.OrderId, id))
            : Builders<Order>.Filter.Eq(o => o.OrderId, id);

        var order = await _db.Orders.Find(filter).FirstOrDefaultAsync();
        if (order == null) return NotFound(ApiResponse<object>.Fail(404, "Order not found"));

        if (order.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to update this order"));
        }

        order.OrderStatus = request.Status.ToUpper().Trim();
        order.UpdatedAt = DateTime.UtcNow;
        await _db.Orders.ReplaceOneAsync(o => o.Id == order.Id, order);

        // Notify Customer
        var notification = new Notification
        {
            Recipient = order.Customer,
            Sender = userId,
            Type = "ORDER_UPDATED",
            Title = $"📦 Order {order.OrderStatus}",
            Message = $"Your order {order.OrderId} is now {order.OrderStatus}.",
            Icon = "📦",
            RelatedEntityId = order.OrderId
        };
        await _db.Notifications.InsertOneAsync(notification);

        return Ok(ApiResponse<Order>.Ok(200, "Order status updated", order));
    }

    [HttpPatch("{id}/supplied")]
    public async Task<IActionResult> MarkSupplied(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Order>.Filter.Or(
                Builders<Order>.Filter.Eq(o => o.Id, id),
                Builders<Order>.Filter.Eq(o => o.OrderId, id))
            : Builders<Order>.Filter.Eq(o => o.OrderId, id);

        var order = await _db.Orders.Find(filter).FirstOrDefaultAsync();
        if (order == null) return NotFound(ApiResponse<object>.Fail(404, "Order not found"));

        if (order.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to update this order"));
        }

        order.OrderStatus = "SUPPLIED";
        order.UpdatedAt = DateTime.UtcNow;
        await _db.Orders.ReplaceOneAsync(o => o.Id == order.Id, order);

        return Ok(ApiResponse<Order>.Ok(200, "Order marked as supplied", order));
    }

    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(string id, [FromBody] CreateCancellationRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Order>.Filter.Or(
                Builders<Order>.Filter.Eq(o => o.Id, id),
                Builders<Order>.Filter.Eq(o => o.OrderId, id))
            : Builders<Order>.Filter.Eq(o => o.OrderId, id);

        var order = await _db.Orders.Find(filter).FirstOrDefaultAsync();
        if (order == null) return NotFound(ApiResponse<object>.Fail(404, "Order not found"));

        if (order.Customer != userId && order.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to cancel this order"));
        }

        order.OrderStatus = "CANCELLED";
        order.UpdatedAt = DateTime.UtcNow;
        await _db.Orders.ReplaceOneAsync(o => o.Id == order.Id, order);

        var cancellation = new Cancellation
        {
            Customer = userId,
            Order = order.Id,
            CancellationType = "SINGLE_DAY",
            SkipDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            Reason = !string.IsNullOrWhiteSpace(request.Reason) ? request.Reason.Trim() : "Order cancellation request",
            Status = "APPROVED"
        };
        await _db.Cancellations.InsertOneAsync(cancellation);

        return Ok(ApiResponse<Order>.Ok(200, "Order cancelled successfully", order));
    }
}
