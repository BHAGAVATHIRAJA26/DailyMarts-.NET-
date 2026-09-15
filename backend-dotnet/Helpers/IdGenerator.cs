namespace DailyMarts.Api.Helpers;

public static class IdGenerator
{
    private static readonly Random _random = new Random();

    public static string GenerateProductId(string category)
    {
        var prefix = !string.IsNullOrWhiteSpace(category) && category.Length >= 3
            ? category[..3].ToUpper()
            : "PRD";
        var ts = Convert.ToString(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), 36).ToUpper();
        return $"DM-{prefix}-{ts}";
    }

    public static string GenerateOrderId()
    {
        var ts = Convert.ToString(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), 36).ToUpper();
        var rand = _random.Next(100, 1000);
        return $"ORD-{DateTime.UtcNow.Year}-{ts}-{rand}";
    }

    public static string GenerateSubscriptionId()
    {
        var ts = Convert.ToString(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), 36).ToUpper();
        var rand = _random.Next(100, 1000);
        return $"SUB-DM-{DateTime.UtcNow.Year}-{ts}-{rand}";
    }

    public static string GeneratePaymentId()
    {
        var ts = Convert.ToString(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), 36).ToUpper();
        var rand = _random.Next(100, 1000);
        return $"PAY-{DateTime.UtcNow.Year}-{ts}-{rand}";
    }

    public static (string BillId, string InvoiceNo) GenerateBillIds()
    {
        var ts = Convert.ToString(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), 36).ToUpper();
        var rand = _random.Next(100, 1000);
        var year = DateTime.UtcNow.Year;
        return ($"BILL-{year}-{ts}-{rand}", $"INV-DM-{year}-{ts}-{rand}");
    }

    public static string GenerateExchangeId()
    {
        var ts = Convert.ToString(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), 36).ToUpper();
        var rand = _random.Next(100, 1000);
        return $"EX-{DateTime.UtcNow.Year}-{ts}-{rand}";
    }

    public static string NormalizeCategory(string? cat)
    {
        if (string.IsNullOrWhiteSpace(cat)) return "OTHER";
        var c = cat.Trim().ToUpper().Replace(" ", "_");
        return c switch
        {
            "MILK" or "MILKS" or "DAIRY" => "MILK",
            "MILK_PRODUCT" or "MILK_PRODUCTS" or "MILKPRODUCT" or "GHEE" or "CURD" or "BUTTER" or "PANEER" => "MILK_PRODUCT",
            "VEGETABLE" or "VEGETABLES" or "VEG" or "VEGGIES" => "VEGETABLE",
            "CHICKEN" or "POULTRY" => "CHICKEN",
            "MEAT" or "MUTTON" or "BEEF" => "MEAT",
            _ => "OTHER"
        };
    }

    public static string GetEmojiForCategory(string category)
    {
        return category switch
        {
            "MILK" => "🥛",
            "MILK_PRODUCT" => "🧈",
            "VEGETABLE" => "🥬",
            "CHICKEN" => "🐔",
            "MEAT" => "🥩",
            _ => "🌾"
        };
    }
}
