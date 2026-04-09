using BTL_AES.Models;
using Microsoft.EntityFrameworkCore;

namespace BTL_AES.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<Rule> Rules => Set<Rule>();
    public DbSet<ViolationLog> ViolationLogs => Set<ViolationLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Device>()
            .HasIndex(d => d.DeviceIdentifier)
            .IsUnique();

        modelBuilder.Entity<Rule>()
            .Property(r => r.RuleType)
            .HasConversion<string>();

        modelBuilder.Entity<ViolationLog>()
            .HasOne(v => v.Device)
            .WithMany()
            .HasForeignKey(v => v.DeviceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ViolationLog>()
            .HasOne(v => v.Rule)
            .WithMany()
            .HasForeignKey(v => v.RuleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
