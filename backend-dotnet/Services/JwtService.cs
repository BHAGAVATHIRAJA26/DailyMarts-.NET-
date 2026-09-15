using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DailyMarts.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace DailyMarts.Api.Services;

public interface IJwtService
{
    string GenerateToken(User user);
    string? ValidateToken(string token);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var secret = _configuration["JwtSettings:Secret"] ?? "dailymarts_super_secret_jwt_key_2026_dindigul_tamilnadu_secure_token_12345";
        var issuer = _configuration["JwtSettings:Issuer"] ?? "DailyMartsApi";
        var audience = _configuration["JwtSettings:Audience"] ?? "DailyMartsClient";
        var days = int.TryParse(_configuration["JwtSettings:ExpiryDays"], out var parsedDays) ? parsedDays : 30;

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secret);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("name", user.Name)
            }),
            Expires = DateTime.UtcNow.AddDays(days),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string? ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        var secret = _configuration["JwtSettings:Secret"] ?? "dailymarts_super_secret_jwt_key_2026_dindigul_tamilnadu_secure_token_12345";
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secret);

        try
        {
            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            var jwtToken = (JwtSecurityToken)validatedToken;
            var userId = jwtToken.Claims.First(x => x.Type == ClaimTypes.NameIdentifier || x.Type == "sub" || x.Type == "nameid").Value;

            return userId;
        }
        catch
        {
            return null;
        }
    }
}
