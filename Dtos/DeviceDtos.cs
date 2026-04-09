using System.ComponentModel.DataAnnotations;

namespace BTL_AES.Dtos;

public class CreateDeviceRequest
{
    [Required]
    [MaxLength(100)]
    public string DeviceIdentifier { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ChildName { get; set; }

    [Range(0, 100)]
    public int BatteryPercent { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }
}

public class UpdateDeviceRequest
{
    [Required]
    [MaxLength(100)]
    public string DeviceIdentifier { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ChildName { get; set; }

    [Range(0, 100)]
    public int BatteryPercent { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }
}

public class PairDeviceRequest
{
    [Required]
    [MaxLength(100)]
    public string DeviceIdentifier { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ChildName { get; set; } = string.Empty;

    [Range(0, 100)]
    public int BatteryPercent { get; set; } = 100;

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }
}

public class UpdateDeviceLocationRequest
{
    [Range(-90, 90)]
    public double Latitude { get; set; }

    [Range(-180, 180)]
    public double Longitude { get; set; }

    [Range(0, 100)]
    public int? BatteryPercent { get; set; }
}

public class RuleViolationStatusDto
{
    public bool HasActiveRule { get; set; }

    public bool IsViolatingRule { get; set; }

    public int? ActiveRuleId { get; set; }

    public string Message { get; set; } = string.Empty;
}

public class DeviceResponse
{
    public int Id { get; set; }

    public string DeviceIdentifier { get; set; } = string.Empty;

    public string? ChildName { get; set; }

    public int BatteryPercent { get; set; }

    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; }

    public RuleViolationStatusDto RuleStatus { get; set; } = new();
}
