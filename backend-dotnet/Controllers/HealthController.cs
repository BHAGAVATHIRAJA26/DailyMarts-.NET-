using DailyMarts.Api.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace DailyMarts.Api.Controllers;

[ApiController]
public class HealthController : ControllerBase
{
    [HttpGet("/")]
    public IActionResult GetRootHealth()
    {
        return Ok(new
        {
            status = "OK",
            message = "🌿 DailyMarts ASP.NET Core REST API Server Active",
            apiHealth = "/api/health",
            timestamp = DateTime.UtcNow
        });
    }

    [HttpGet("/api/health")]
    public IActionResult GetApiHealth()
    {
        return Ok(new
        {
            status = "OK",
            message = "DailyMarts .NET Backend REST API running",
            timestamp = DateTime.UtcNow
        });
    }
}
