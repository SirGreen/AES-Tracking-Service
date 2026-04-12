using System.ComponentModel.DataAnnotations;
using BTL_AES.Models.Enums;

namespace BTL_AES.Models;

public class Rule
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ChildName { get; set; } = string.Empty;

    public RuleType RuleType { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public double? CenterLatitude { get; set; }

    public double? CenterLongitude { get; set; }

    public double? RadiusMeters { get; set; }

    public string? PolygonCoordinatesJson { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
