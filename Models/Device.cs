using System.ComponentModel.DataAnnotations;

namespace BTL_AES.Models;

public class Device
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string DeviceIdentifier { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ChildName { get; set; }

    [Range(0, 100)]
    public int BatteryPercent { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
