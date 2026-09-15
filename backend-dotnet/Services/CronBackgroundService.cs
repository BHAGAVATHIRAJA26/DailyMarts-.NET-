using DailyMarts.Api.Data;
using DailyMarts.Api.Models;
using MongoDB.Driver;

namespace DailyMarts.Api.Services;

public class CronBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CronBackgroundService> _logger;

    public CronBackgroundService(IServiceProvider serviceProvider, ILogger<CronBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🕒 DailyMarts Cron Scheduled Service Initialized");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                // Calculate time until midnight UTC / IST
                var nextRun = DateTime.Today.AddDays(1);
                var delay = nextRun - DateTime.Now;
                if (delay <= TimeSpan.Zero) delay = TimeSpan.FromHours(24);

                _logger.LogInformation("🕒 Next scheduled daily delivery generation in {Delay}", delay);

                // Run delivery generation task
                await GenerateDailyDeliveriesFromSubscriptionsAsync();

                // Wait until next midnight or until cancelled
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in CronBackgroundService: {Message}", ex.Message);
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
        }
    }

    private async Task GenerateDailyDeliveriesFromSubscriptionsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MongoDbContext>();

        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        _logger.LogInformation("🔄 Cron Running: Generating daily delivery records for date {Date}", today);

        try
        {
            var activeSubscriptions = await db.Subscriptions
                .Find(s => s.Status == "ACTIVE")
                .ToListAsync();

            int createdCount = 0;

            foreach (var sub in activeSubscriptions)
            {
                // Check if delivery already exists today
                var existing = await db.Deliveries
                    .Find(d => d.Customer == sub.Customer && d.Product == sub.Product && d.Date == today)
                    .FirstOrDefaultAsync();

                if (existing == null)
                {
                    var delivery = new Delivery
                    {
                        Subscription = sub.Id,
                        Customer = sub.Customer,
                        Farmer = sub.Farmer,
                        Product = sub.Product,
                        Date = today,
                        DeliverySlot = sub.DeliverySlot,
                        RequestedQuantity = sub.Quantity,
                        DeliveredQuantity = sub.Quantity,
                        Unit = sub.Unit,
                        PricePerUnit = sub.PricePerUnit,
                        TotalCost = (decimal)sub.Quantity * sub.PricePerUnit,
                        Status = "PENDING"
                    };

                    await db.Deliveries.InsertOneAsync(delivery);
                    createdCount++;
                }
            }

            _logger.LogInformation("✅ Daily delivery generation complete: {Count} delivery records created", createdCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Failed to generate daily delivery records: {Message}", ex.Message);
        }
    }
}
