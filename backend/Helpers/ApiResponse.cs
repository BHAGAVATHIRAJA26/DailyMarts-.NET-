using System.Text.Json.Serialization;

namespace DailyMarts.Api.Helpers;

public class ApiResponse<T>
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("status")]
    public int Status { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("data")]
    public T? Data { get; set; }

    public static ApiResponse<T> Ok(int status, string message, T? data = default)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Status = status,
            Message = message,
            Data = data
        };
    }

    public static ApiResponse<T> Fail(int status, string message)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Status = status,
            Message = message,
            Data = default
        };
    }
}
