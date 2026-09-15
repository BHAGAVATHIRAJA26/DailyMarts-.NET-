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
[Route("api/products")]
[Route("products")]
public class ProductsController : ControllerBase
{
    private readonly MongoDbContext _db;

    public ProductsController(MongoDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> SearchProducts(
        [FromQuery] string? name,
        [FromQuery] string? productId,
        [FromQuery] string? category,
        [FromQuery] string? location,
        [FromQuery] string? farmerId,
        [FromQuery] string? availability,
        [FromQuery] string? status)
    {
        var filterBuilder = Builders<Product>.Filter;
        var filters = new List<FilterDefinition<Product>>();

        if (!string.IsNullOrWhiteSpace(status))
        {
            filters.Add(filterBuilder.Eq(p => p.Status, status.ToUpper().Trim()));
        }
        else if (string.IsNullOrWhiteSpace(farmerId))
        {
            filters.Add(filterBuilder.In(p => p.Status, new[] { "AVAILABLE", "LIMITED" }));
        }

        if (!string.IsNullOrWhiteSpace(name))
        {
            filters.Add(filterBuilder.Regex(p => p.Name, new BsonRegularExpression(name.Trim(), "i")));
        }

        if (!string.IsNullOrWhiteSpace(productId))
        {
            filters.Add(filterBuilder.Regex(p => p.ProductId, new BsonRegularExpression(productId.Trim(), "i")));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalized = IdGenerator.NormalizeCategory(category);
            filters.Add(filterBuilder.Eq(p => p.Category, normalized));
        }

        if (!string.IsNullOrWhiteSpace(location) && location != "All Locations")
        {
            filters.Add(filterBuilder.Regex(p => p.Location, new BsonRegularExpression(location.Trim(), "i")));
        }

        if (!string.IsNullOrWhiteSpace(farmerId))
        {
            filters.Add(filterBuilder.Eq(p => p.Farmer, farmerId));
        }

        if (availability == "available")
        {
            filters.Add(filterBuilder.Eq(p => p.Status, "AVAILABLE"));
        }

        var combinedFilter = filters.Count > 0 ? filterBuilder.And(filters) : filterBuilder.Empty;

        var products = await _db.Products.Find(combinedFilter)
            .SortByDescending(p => p.CreatedAt)
            .ToListAsync();

        // Populate Farmer details for each product
        var farmerIds = products.Select(p => p.Farmer).Distinct().ToList();
        var farmers = await _db.Users.Find(u => farmerIds.Contains(u.Id)).ToListAsync();
        var farmerMap = farmers.ToDictionary(u => u.Id);

        foreach (var prod in products)
        {
            if (farmerMap.TryGetValue(prod.Farmer, out var farmer))
            {
                prod.FarmerDetails = farmer;
            }
        }

        return Ok(ApiResponse<List<Product>>.Ok(200, $"Found {products.Count} products", products));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProductById(string id)
    {
        var isObjectId = ObjectId.TryParse(id, out _);

        var filter = isObjectId
            ? Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Eq(p => p.Id, id),
                Builders<Product>.Filter.Eq(p => p.ProductId, id))
            : Builders<Product>.Filter.Eq(p => p.ProductId, id);

        var product = await _db.Products.Find(filter).FirstOrDefaultAsync();

        if (product == null)
        {
            return NotFound(ApiResponse<object>.Fail(404, "Product not found"));
        }

        var farmer = await _db.Users.Find(u => u.Id == product.Farmer).FirstOrDefaultAsync();
        product.FarmerDetails = farmer;

        return Ok(ApiResponse<Product>.Ok(200, "Product details fetched", product));
    }

    [HttpPost]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Price <= 0)
        {
            return BadRequest(ApiResponse<object>.Fail(400, "Product name and price are required"));
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        var farmer = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (farmer == null) return NotFound(ApiResponse<object>.Fail(404, "Farmer user not found"));

        var normalizedCategory = IdGenerator.NormalizeCategory(request.Category);
        var productId = IdGenerator.GenerateProductId(normalizedCategory);

        var product = new Product
        {
            ProductId = productId,
            Name = request.Name.Trim(),
            Category = normalizedCategory,
            Description = request.Description?.Trim() ?? string.Empty,
            Unit = !string.IsNullOrWhiteSpace(request.Unit) ? request.Unit : "L",
            Price = request.Price,
            Farmer = farmer.Id,
            Location = farmer.City ?? farmer.District ?? "Dindigul",
            Emoji = IdGenerator.GetEmojiForCategory(normalizedCategory),
            FatContent = request.FatContent,
            SnfContent = request.SnfContent,
            MilkingSlot = request.MilkingSlot,
            Packaging = request.Packaging ?? "Eco Glass Bottle",
            IsOrganic = request.IsOrganic ?? true,
            IsA2 = request.IsA2 ?? false,
            Status = "AVAILABLE"
        };

        await _db.Products.InsertOneAsync(product);

        // Initialize today's daily inventory
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var inventory = new DailyInventory
        {
            Product = product.Id,
            ProductId = product.ProductId,
            Farmer = farmer.Id,
            Date = today,
            AvailableQuantity = 50,
            SoldQuantity = 0,
            RemainingQuantity = 50,
            Unit = product.Unit,
            Price = product.Price,
            Status = "AVAILABLE"
        };

        await _db.DailyInventories.InsertOneAsync(inventory);

        return StatusCode(201, ApiResponse<Product>.Ok(201, "Product created successfully", product));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> UpdateProduct(string id, [FromBody] UpdateProductRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Eq(p => p.Id, id),
                Builders<Product>.Filter.Eq(p => p.ProductId, id))
            : Builders<Product>.Filter.Eq(p => p.ProductId, id);

        var product = await _db.Products.Find(filter).FirstOrDefaultAsync();
        if (product == null)
        {
            return NotFound(ApiResponse<object>.Fail(404, "Product not found"));
        }

        if (product.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to edit this product"));
        }

        if (!string.IsNullOrWhiteSpace(request.Name)) product.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            product.Category = IdGenerator.NormalizeCategory(request.Category);
            product.Emoji = IdGenerator.GetEmojiForCategory(product.Category);
        }
        if (request.Description != null) product.Description = request.Description.Trim();
        if (!string.IsNullOrWhiteSpace(request.Unit)) product.Unit = request.Unit;
        if (request.Price.HasValue) product.Price = request.Price.Value;
        if (request.FatContent != null) product.FatContent = request.FatContent;
        if (request.SnfContent != null) product.SnfContent = request.SnfContent;
        if (request.MilkingSlot != null) product.MilkingSlot = request.MilkingSlot;
        if (request.Packaging != null) product.Packaging = request.Packaging;
        if (request.IsOrganic.HasValue) product.IsOrganic = request.IsOrganic.Value;
        if (request.IsA2.HasValue) product.IsA2 = request.IsA2.Value;
        if (!string.IsNullOrWhiteSpace(request.Status)) product.Status = request.Status.ToUpper().Trim();

        product.UpdatedAt = DateTime.UtcNow;

        await _db.Products.ReplaceOneAsync(p => p.Id == product.Id, product);

        return Ok(ApiResponse<Product>.Ok(200, "Product updated successfully", product));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> DeleteProduct(string id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Eq(p => p.Id, id),
                Builders<Product>.Filter.Eq(p => p.ProductId, id))
            : Builders<Product>.Filter.Eq(p => p.ProductId, id);

        var product = await _db.Products.Find(filter).FirstOrDefaultAsync();
        if (product == null)
        {
            return NotFound(ApiResponse<object>.Fail(404, "Product not found"));
        }

        if (product.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to delete this product"));
        }

        await _db.Products.DeleteOneAsync(p => p.Id == product.Id);

        return Ok(ApiResponse<object>.Ok(200, "Product deleted successfully", null));
    }

    [HttpPatch("{id}/capacity")]
    [Authorize(Roles = "FARMER")]
    public async Task<IActionResult> UpdateCapacity(string id, [FromBody] UpdateCapacityRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        var isObjectId = ObjectId.TryParse(id, out _);
        var filter = isObjectId
            ? Builders<Product>.Filter.Or(
                Builders<Product>.Filter.Eq(p => p.Id, id),
                Builders<Product>.Filter.Eq(p => p.ProductId, id))
            : Builders<Product>.Filter.Eq(p => p.ProductId, id);

        var product = await _db.Products.Find(filter).FirstOrDefaultAsync();
        if (product == null) return NotFound(ApiResponse<object>.Fail(404, "Product not found"));

        if (product.Farmer != userId)
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, "Not authorized to update inventory for this product"));
        }

        var targetDate = !string.IsNullOrWhiteSpace(request.Date) ? request.Date : DateTime.UtcNow.ToString("yyyy-MM-dd");
        var newAvailable = request.AvailableQuantity;

        var inventory = await _db.DailyInventories
            .Find(i => i.Product == product.Id && i.Date == targetDate)
            .FirstOrDefaultAsync();

        var currentSold = inventory?.SoldQuantity ?? 0;
        if (newAvailable < currentSold)
        {
            return BadRequest(ApiResponse<object>.Fail(400, $"Cannot reduce capacity below already sold quantity ({currentSold} {product.Unit})"));
        }

        var remaining = newAvailable - currentSold;
        var status = remaining == 0 ? "SOLD_OUT" : remaining < 5 ? "LIMITED" : "AVAILABLE";

        if (inventory == null)
        {
            inventory = new DailyInventory
            {
                Product = product.Id,
                ProductId = product.ProductId,
                Farmer = userId,
                Date = targetDate,
                AvailableQuantity = newAvailable,
                SoldQuantity = 0,
                RemainingQuantity = remaining,
                Unit = product.Unit,
                Price = product.Price,
                Status = status
            };
            await _db.DailyInventories.InsertOneAsync(inventory);
        }
        else
        {
            inventory.AvailableQuantity = newAvailable;
            inventory.RemainingQuantity = remaining;
            inventory.Status = status;
            inventory.UpdatedAt = DateTime.UtcNow;

            await _db.DailyInventories.ReplaceOneAsync(i => i.Id == inventory.Id, inventory);
        }

        // Update product status
        product.Status = status;
        await _db.Products.ReplaceOneAsync(p => p.Id == product.Id, product);

        return Ok(ApiResponse<DailyInventory>.Ok(200, "Daily capacity updated successfully", inventory));
    }
}
