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
[Route("api/auth")]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly MongoDbContext _db;
    private readonly IJwtService _jwtService;
    private readonly IEmailService _emailService;

    public AuthController(MongoDbContext db, IJwtService jwtService, IEmailService emailService)
    {
        _db = db;
        _jwtService = jwtService;
        _emailService = emailService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(ApiResponse<object>.Fail(400, "Please provide email and password"));
        }

        var existingUser = await _db.Users.Find(u => u.Email.ToLower() == request.Email.ToLower().Trim()).FirstOrDefaultAsync();
        if (existingUser != null)
        {
            return BadRequest(ApiResponse<object>.Fail(400, "User with this email already exists"));
        }

        var role = !string.IsNullOrWhiteSpace(request.Role) ? request.Role.ToUpper().Trim() : "CUSTOMER";
        if (role != "CUSTOMER" && role != "FARMER")
        {
            return BadRequest(ApiResponse<object>.Fail(400, "Role must be CUSTOMER or FARMER"));
        }

        var coordinates = request.Coordinates != null && request.Coordinates.Length == 2
            ? request.Coordinates
            : new double[] { 77.9803, 10.3673 };

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = request.Email.ToLower().Trim(),
            Phone = request.Phone.Trim(),
            Password = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
            FarmName = role == "FARMER" ? (!string.IsNullOrWhiteSpace(request.FarmName) ? request.FarmName.Trim() : $"{request.Name}'s Farm") : null,
            UpiId = role == "FARMER" ? request.UpiId?.Trim() : null,
            Categories = request.Categories ?? new List<string> { "MILK", "MILK_PRODUCT" },
            Address = request.Address?.Trim() ?? "Main Road",
            City = request.City?.Trim() ?? "Dindigul",
            District = request.District?.Trim() ?? "Dindigul",
            State = request.State?.Trim() ?? "Tamil Nadu",
            Pincode = request.Pincode?.Trim() ?? "624001",
            Location = new LocationPoint { Coordinates = coordinates }
        };

        await _db.Users.InsertOneAsync(user);

        var token = _jwtService.GenerateToken(user);

        // Send Welcome Email asynchronously
        _ = _emailService.SendWelcomeEmailAsync(user);

        var response = new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role,
            FarmName = user.FarmName,
            UpiId = user.UpiId,
            Location = user.City,
            Address = user.Address,
            Token = token
        };

        return StatusCode(201, ApiResponse<AuthResponse>.Ok(201, "User registered successfully", response));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(ApiResponse<object>.Fail(400, "Please provide email and password"));
        }

        var user = await _db.Users.Find(u => u.Email.ToLower() == request.Email.ToLower().Trim()).FirstOrDefaultAsync();
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
        {
            return Unauthorized(ApiResponse<object>.Fail(401, "Invalid email or password"));
        }

        if (!string.IsNullOrWhiteSpace(request.Role) && user.Role != request.Role.ToUpper().Trim())
        {
            return StatusCode(403, ApiResponse<object>.Fail(403, $"Account exists as {user.Role}, not {request.Role.ToUpper()}"));
        }

        var token = _jwtService.GenerateToken(user);

        var response = new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role,
            FarmName = user.FarmName,
            UpiId = user.UpiId,
            Location = user.City,
            Address = user.Address,
            Token = token
        };

        return Ok(ApiResponse<AuthResponse>.Ok(200, "Logged in successfully", response));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(ApiResponse<object>.Ok(200, "Logged out successfully", null));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return NotFound(ApiResponse<object>.Fail(404, "User not found"));

        return Ok(ApiResponse<User>.Ok(200, "User profile fetched", user));
    }

    [HttpPut("profile")]
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized(ApiResponse<object>.Fail(401, "Not authorized"));

        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return NotFound(ApiResponse<object>.Fail(404, "User not found"));

        if (!string.IsNullOrWhiteSpace(request.Name)) user.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Phone)) user.Phone = request.Phone.Trim();
        if (!string.IsNullOrWhiteSpace(request.Address)) user.Address = request.Address.Trim();
        if (!string.IsNullOrWhiteSpace(request.City)) user.City = request.City.Trim();
        if (!string.IsNullOrWhiteSpace(request.District)) user.District = request.District.Trim();
        if (!string.IsNullOrWhiteSpace(request.State)) user.State = request.State.Trim();
        if (!string.IsNullOrWhiteSpace(request.Pincode)) user.Pincode = request.Pincode.Trim();

        if (user.Role == "FARMER")
        {
            if (!string.IsNullOrWhiteSpace(request.FarmName)) user.FarmName = request.FarmName.Trim();
            if (request.UpiId != null) user.UpiId = string.IsNullOrWhiteSpace(request.UpiId) ? null : request.UpiId.Trim();
            if (request.Categories != null) user.Categories = request.Categories;
            if (request.DairyCowsCount.HasValue) user.DairyCowsCount = request.DairyCowsCount.Value;
            if (request.DailyYieldEstimate != null) user.DailyYieldEstimate = request.DailyYieldEstimate;
        }

        user.UpdatedAt = DateTime.UtcNow;

        await _db.Users.ReplaceOneAsync(u => u.Id == userId, user);

        return Ok(ApiResponse<User>.Ok(200, "Profile updated successfully", user));
    }

    [HttpPost("forgot-password")]
    public IActionResult ForgotPassword([FromBody] Dictionary<string, string> body)
    {
        return Ok(ApiResponse<object>.Ok(200, "If your email is registered, a password reset link has been sent.", null));
    }
}
