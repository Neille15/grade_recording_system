using BackEnd.Data;
using BackEnd.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Services;

public sealed class AdminSeeder(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<AdminSeeder> logger)
{
    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<PedagoclickContext>();
        var admin = await db.Users.SingleOrDefaultAsync(user => user.Email == "aquino@demo.local", cancellationToken);
        if (admin is null || !admin.PasswordHash.StartsWith("!DEMO-PLACEHOLDER", StringComparison.Ordinal))
            return;
        var password = configuration["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("Seed:AdminPassword is missing; the placeholder admin password was not replaced.");
            return;
        }
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
        admin.PasswordHash = hasher.HashPassword(admin, password);
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("The demo admin password placeholder was replaced.");
    }
}
