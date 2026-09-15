using System.Text.Json.Serialization;

namespace DailyMarts.Api.DTOs;

public class RegisterRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Role { get; set; } = "CUSTOMER";
    public string? FarmName { get; set; }
    public List<string>? Categories { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public double[]? Coordinates { get; set; }
    public string? UpiId { get; set; }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Role { get; set; }
}

public class AuthResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? FarmName { get; set; }
    public string? UpiId { get; set; }
    public string Location { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string Token { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? District { get; set; }
    public string? State { get; set; }
    public string? Pincode { get; set; }
    public string? FarmName { get; set; }
    public string? UpiId { get; set; }
    public List<string>? Categories { get; set; }
    public int? DairyCowsCount { get; set; }
    public string? DailyYieldEstimate { get; set; }
}
