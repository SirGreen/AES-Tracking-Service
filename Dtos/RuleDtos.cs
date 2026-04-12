using System.ComponentModel.DataAnnotations;
using BTL_AES.Models;
using BTL_AES.Models.Enums;

namespace BTL_AES.Dtos;

public class CreateRuleRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ChildName { get; set; } = string.Empty;

    [Required]
    public RuleType RuleType { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public double? CenterLatitude { get; set; }

    public double? CenterLongitude { get; set; }

    public double? RadiusMeters { get; set; }

    public List<GeoPoint>? PolygonCoordinates { get; set; }
}

public class UpdateRuleRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ChildName { get; set; } = string.Empty;

    [Required]
    public RuleType RuleType { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public double? CenterLatitude { get; set; }

    public double? CenterLongitude { get; set; }

    public double? RadiusMeters { get; set; }

    public List<GeoPoint>? PolygonCoordinates { get; set; }
}

public class RuleResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string ChildName { get; set; } = string.Empty;

    public RuleType RuleType { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public double? CenterLatitude { get; set; }

    public double? CenterLongitude { get; set; }

    public double? RadiusMeters { get; set; }

    public List<GeoPoint>? PolygonCoordinates { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
