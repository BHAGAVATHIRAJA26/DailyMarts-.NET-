using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using DailyMarts.Api.Models;

namespace DailyMarts.Api.Services;

public interface IEmailService
{
    Task SendWelcomeEmailAsync(User user);
    Task SendOrderConfirmationEmailAsync(User user, Order order);
    Task SendPaymentReminderEmailAsync(User farmer, User customer, decimal pendingAmount, string dueDate, string invoiceNo);
    Task SendFarmerToCustomerEmailAsync(User farmer, User customer, string subject, string message, object? data);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
        _httpClient = new HttpClient();
    }

    private async Task SendResendEmailAsync(string to, string subject, string htmlContent)
    {
        var apiKey = _configuration["ResendSettings:ApiKey"];
        var fromEmail = _configuration["ResendSettings:FromEmail"] ?? "DailyMarts <onboarding@resend.dev>";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("re_your_"))
        {
            Console.WriteLine($"[Email Log] Skipping email send (API key not configured). To: {to}, Subject: {subject}");
            return;
        }

        try
        {
            var payload = new
            {
                from = fromEmail,
                to = new[] { to },
                subject = subject,
                html = htmlContent
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                Console.WriteLine($"✅ Email sent via Resend to {to}");
            }
            else
            {
                var body = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"❌ Resend Email Failed ({response.StatusCode}): {body}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Email sending error: {ex.Message}");
        }
    }

    public async Task SendWelcomeEmailAsync(User user)
    {
        var subject = "🌿 Welcome to DailyMarts — Fresh Milk & Farm Produce Delivered Daily";
        var html = $@"
            <h2>Welcome to DailyMarts, {user.Name}!</h2>
            <p>Thank you for joining DailyMarts as a <strong>{user.Role}</strong>.</p>
            <p>Enjoy direct farm-to-table deliveries of pure organic milk, dairy products, and fresh vegetables.</p>
            <br/>
            <p>Best regards,<br/>The DailyMarts Team</p>";

        await SendResendEmailAsync(user.Email, subject, html);
    }

    public async Task SendOrderConfirmationEmailAsync(User user, Order order)
    {
        var subject = $"📦 DailyMarts Order Confirmation — #{order.OrderId}";
        var html = $@"
            <h2>Order Confirmed!</h2>
            <p>Hello {user.Name},</p>
            <p>Your order <strong>#{order.OrderId}</strong> for {order.Quantity} {order.Unit} has been received.</p>
            <p>Total Amount: ₹{order.TotalAmount}</p>
            <p>Delivery Slot: {order.DeliverySlot} on {order.DeliveryDate}</p>";

        await SendResendEmailAsync(user.Email, subject, html);
    }

    public async Task SendPaymentReminderEmailAsync(User farmer, User customer, decimal pendingAmount, string dueDate, string invoiceNo)
    {
        var subject = $"💳 Payment Reminder from {farmer.FarmName ?? farmer.Name} — ₹{pendingAmount}";
        var html = $@"
            <h2>Payment Reminder</h2>
            <p>Dear {customer.Name},</p>
            <p>Farmer <strong>{farmer.FarmName ?? farmer.Name}</strong> sent a reminder for your pending bill (Invoice #{invoiceNo}).</p>
            <p>Outstanding Amount: <strong>₹{pendingAmount}</strong></p>
            <p>Due Date: <strong>{dueDate}</strong></p>
            <p>Please log in to DailyMarts to make your UPI payment.</p>";

        await SendResendEmailAsync(customer.Email, subject, html);
    }

    public async Task SendFarmerToCustomerEmailAsync(User farmer, User customer, string subject, string message, object? data)
    {
        var html = $@"
            <h2>Update from {farmer.FarmName ?? farmer.Name}</h2>
            <p>Dear {customer.Name},</p>
            <p>{message}</p>";

        await SendResendEmailAsync(customer.Email, subject, html);
    }
}
