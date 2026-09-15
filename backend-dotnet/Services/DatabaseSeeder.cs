using DailyMarts.Api.Data;
using DailyMarts.Api.Helpers;
using DailyMarts.Api.Models;
using MongoDB.Driver;

namespace DailyMarts.Api.Services;

public class DatabaseSeeder
{
    private readonly MongoDbContext _db;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(MongoDbContext db, ILogger<DatabaseSeeder> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            var userCount = await _db.Users.CountDocumentsAsync(Builders<User>.Filter.Empty);
            if (userCount > 0)
            {
                _logger.LogInformation("🌱 Database already contains data. Skipping seed.");
                return;
            }

            _logger.LogInformation("🌱 Seeding initial DailyMarts database...");

            // 1. Create Farmers
            var farmer1 = new User
            {
                Name = "Muthusamy G",
                Email = "farmer@dailymarts.com",
                Phone = "+91 98421 54321",
                Password = BCrypt.Net.BCrypt.HashPassword("farmer123"),
                Role = "FARMER",
                FarmName = "Velliangiri Organic Farm",
                UpiId = "muthusamy@upi",
                WalletBalance = 14800,
                Categories = new List<string> { "MILK", "MILK_PRODUCT", "VEGETABLE" },
                Address = "12/A Palani Road, Near Water Tank",
                City = "Dindigul",
                District = "Dindigul",
                State = "Tamil Nadu",
                Pincode = "624001",
                Location = new LocationPoint { Coordinates = new double[] { 77.9803, 10.3673 } }
            };

            var farmer2 = new User
            {
                Name = "Kannammal S",
                Email = "kannammal@dailymarts.com",
                Phone = "+91 94432 87654",
                Password = BCrypt.Net.BCrypt.HashPassword("farmer123"),
                Role = "FARMER",
                FarmName = "Sri Green Organic Dairy",
                UpiId = "kannammal@okaxis",
                WalletBalance = 9500,
                Categories = new List<string> { "MILK", "MILK_PRODUCT" },
                Address = "45 Sirumalai Foothills",
                City = "Dindigul",
                District = "Dindigul",
                State = "Tamil Nadu",
                Pincode = "624003",
                Location = new LocationPoint { Coordinates = new double[] { 77.9950, 10.3400 } }
            };

            // 2. Create Customers
            var customer1 = new User
            {
                Name = "Anitha Ramesh",
                Email = "customer@dailymarts.com",
                Phone = "+91 98940 12345",
                Password = BCrypt.Net.BCrypt.HashPassword("customer123"),
                Role = "CUSTOMER",
                Address = "78 GT Nagar, Near Bus Stand",
                City = "Dindigul",
                District = "Dindigul",
                State = "Tamil Nadu",
                Pincode = "624001",
                Location = new LocationPoint { Coordinates = new double[] { 77.9750, 10.3600 } }
            };

            await _db.Users.InsertManyAsync(new[] { farmer1, farmer2, customer1 });

            // 3. Create Products
            var prod1 = new Product
            {
                ProductId = IdGenerator.GenerateProductId("MILK"),
                Name = "A2 Desi Cow Raw Milk",
                Category = "MILK",
                Description = "Pure unpasteurized A2 milk directly from native Kangayam cows.",
                Unit = "L",
                Price = 66,
                Farmer = farmer1.Id,
                Location = "Dindigul",
                Emoji = "🥛",
                FatContent = "4.8% Fat",
                SnfContent = "8.6% SNF",
                MilkingSlot = "4:30 AM Milking",
                Packaging = "Eco Glass Bottle",
                IsOrganic = true,
                IsA2 = true,
                Status = "AVAILABLE",
                Rating = 4.9,
                ReviewCount = 84
            };

            var prod2 = new Product
            {
                ProductId = IdGenerator.GenerateProductId("MILK_PRODUCT"),
                Name = "Pure Desi Cow Ghee",
                Category = "MILK_PRODUCT",
                Description = "Traditional Bilona method curd-churned golden ghee.",
                Unit = "500g",
                Price = 450,
                Farmer = farmer1.Id,
                Location = "Dindigul",
                Emoji = "🧈",
                Packaging = "Glass Jar",
                IsOrganic = true,
                Status = "AVAILABLE",
                Rating = 5.0,
                ReviewCount = 42
            };

            var prod3 = new Product
            {
                ProductId = IdGenerator.GenerateProductId("MILK"),
                Name = "Buffalo Fresh Farm Milk",
                Category = "MILK",
                Description = "Thick, creamy buffalo milk ideal for curd and tea.",
                Unit = "L",
                Price = 70,
                Farmer = farmer2.Id,
                Location = "Dindigul",
                Emoji = "🥛",
                FatContent = "6.5% Fat",
                SnfContent = "9.0% SNF",
                Packaging = "Stainless Steel Can",
                IsOrganic = true,
                Status = "AVAILABLE",
                Rating = 4.8,
                ReviewCount = 56
            };

            await _db.Products.InsertManyAsync(new[] { prod1, prod2, prod3 });

            // 4. Create Daily Inventory
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var inv1 = new DailyInventory
            {
                Product = prod1.Id,
                ProductId = prod1.ProductId,
                Farmer = farmer1.Id,
                Date = today,
                AvailableQuantity = 50,
                SoldQuantity = 2,
                RemainingQuantity = 48,
                Unit = "L",
                Price = 66,
                Status = "AVAILABLE"
            };

            var inv2 = new DailyInventory
            {
                Product = prod3.Id,
                ProductId = prod3.ProductId,
                Farmer = farmer2.Id,
                Date = today,
                AvailableQuantity = 40,
                SoldQuantity = 0,
                RemainingQuantity = 40,
                Unit = "L",
                Price = 70,
                Status = "AVAILABLE"
            };

            await _db.DailyInventories.InsertManyAsync(new[] { inv1, inv2 });

            _logger.LogInformation("🌱 DailyMarts Database seeded successfully!");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Database seeding error: {Message}", ex.Message);
        }
    }
}
