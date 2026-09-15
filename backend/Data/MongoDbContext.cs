using DailyMarts.Api.Models;
using MongoDB.Driver;

namespace DailyMarts.Api.Data;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IConfiguration configuration)
    {
        var connectionString = configuration.GetSection("MongoDbSettings:ConnectionString").Value
            ?? "mongodb://localhost:27017/dailymarts";
        var databaseName = configuration.GetSection("MongoDbSettings:DatabaseName").Value
            ?? "dailymarts";

        var client = new MongoClient(connectionString);
        _database = client.GetDatabase(databaseName);

        InitIndexes();
    }

    public IMongoCollection<User> Users => _database.GetCollection<User>("users");
    public IMongoCollection<Product> Products => _database.GetCollection<Product>("products");
    public IMongoCollection<Order> Orders => _database.GetCollection<Order>("orders");
    public IMongoCollection<Subscription> Subscriptions => _database.GetCollection<Subscription>("subscriptions");
    public IMongoCollection<DailyInventory> DailyInventories => _database.GetCollection<DailyInventory>("dailyinventories");
    public IMongoCollection<Delivery> Deliveries => _database.GetCollection<Delivery>("deliveries");
    public IMongoCollection<Bill> Bills => _database.GetCollection<Bill>("bills");
    public IMongoCollection<Payment> Payments => _database.GetCollection<Payment>("payments");
    public IMongoCollection<Cancellation> Cancellations => _database.GetCollection<Cancellation>("cancellations");
    public IMongoCollection<Notification> Notifications => _database.GetCollection<Notification>("notifications");
    public IMongoCollection<ProductExchange> ProductExchanges => _database.GetCollection<ProductExchange>("productexchanges");

    private void InitIndexes()
    {
        try
        {
            // 2dsphere index for user location
            var keys = Builders<User>.IndexKeys.Geo2DSphere(u => u.Location);
            Users.Indexes.CreateOne(new CreateIndexModel<User>(keys));
        }
        catch
        {
            // Index creation error safety
        }
    }
}
