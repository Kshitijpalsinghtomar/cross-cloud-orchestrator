using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddLogging(config => config.AddConsole());

var app = builder.Build();
var logger = app.Services.GetRequiredService<ILogger<Program>>();

app.MapGet("/", () => "C# Notification Service v1.0");

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "notification-service" }));

app.MapPost("/notifications/send", async (HttpRequest request) =>
{
    try
    {
        var body = await JsonSerializer.DeserializeAsync<NotificationRequest>(request.Body);
        
        if (string.IsNullOrEmpty(body?.To))
        {
            return Results.BadRequest(new { error = "Missing 'to' field" });
        }

        // Simulate sending notification
        logger.LogInformation($"📧 Sending notification to: {body.To}");
        await Task.Delay(100); // Simulate async operation

        var response = new NotificationResponse
        {
            Success = true,
            MessageId = Guid.NewGuid().ToString(),
            To = body.To,
            Type = body.Type ?? "email",
            Message = body.Message ?? "Default notification",
            SentAt = DateTime.UtcNow.ToString("o")
        };

        logger.LogInformation($"✅ Notification sent: {response.MessageId}");
        return Results.Ok(response);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { error = "Invalid JSON body" });
    }
});

app.MapPost("/notifications/bulk", async (HttpRequest request) =>
{
    try
    {
        var body = await JsonSerializer.DeserializeAsync<BulkNotificationRequest>(request.Body);
        
        if (body?.Recipients == null || body.Recipients.Length == 0)
        {
            return Results.BadRequest(new { error = "Missing or empty 'recipients' array" });
        }

        var results = new List<NotificationResponse>();
        foreach (var recipient in body.Recipients)
        {
            logger.LogInformation($"📧 Bulk sending to: {recipient}");
            results.Add(new NotificationResponse
            {
                Success = true,
                MessageId = Guid.NewGuid().ToString(),
                To = recipient,
                Type = body.Type ?? "email",
                Message = body.Message ?? "Bulk notification",
                SentAt = DateTime.UtcNow.ToString("o")
            });
        }

        return Results.Ok(new { 
            totalSent = results.Count, 
            notifications = results 
        });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { error = "Invalid JSON body" });
    }
});

logger.LogInformation("🔔 C# Notification Service starting on port 8082...");
app.Run("http://0.0.0.0:8082");

record NotificationRequest(string To, string? Type, string? Message);
record BulkNotificationRequest(string[] Recipients, string? Type, string? Message);

class NotificationResponse
{
    public bool Success { get; set; }
    public string MessageId { get; set; } = "";
    public string To { get; set; } = "";
    public string Type { get; set; } = "";
    public string Message { get; set; } = "";
    public string SentAt { get; set; } = "";
}
