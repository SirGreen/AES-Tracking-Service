using System.Text.Json;
using BTL_AES.Data;
using BTL_AES.Dtos;
using BTL_AES.Models;
using BTL_AES.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BTL_AES.Services;

public class RuleEvaluationService(AppDbContext dbContext) : IRuleEvaluationService
{
    private readonly AppDbContext _dbContext = dbContext;

    public async Task<RuleValidationResult> ValidateRuleAsync(Rule rule, int? ignoreRuleId = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rule.ChildName))
        {
            return new RuleValidationResult(false, "Child name is required.");
        }

        if (rule.StartTime >= rule.EndTime)
        {
            return new RuleValidationResult(false, "Rule start time must be before end time.");
        }

        if (rule.RuleType == RuleType.Circle)
        {
            if (rule.CenterLatitude is null || rule.CenterLongitude is null || rule.RadiusMeters is null)
            {
                return new RuleValidationResult(false, "Circle rules require a center latitude, center longitude, and radius in meters.");
            }

            if (!IsValidLatitude(rule.CenterLatitude.Value) || !IsValidLongitude(rule.CenterLongitude.Value))
            {
                return new RuleValidationResult(false, "Circle coordinates are out of range.");
            }

            if (rule.RadiusMeters <= 0)
            {
                return new RuleValidationResult(false, "Circle radius must be greater than zero.");
            }
        }

        if (rule.RuleType == RuleType.Polygon)
        {
            var points = DeserializePolygon(rule.PolygonCoordinatesJson);
            if (points.Count < 3)
            {
                return new RuleValidationResult(false, "Polygon rules require at least three coordinate points.");
            }

            if (points.Any(point => !IsValidLatitude(point.Latitude) || !IsValidLongitude(point.Longitude)))
            {
                return new RuleValidationResult(false, "Polygon coordinates are out of range.");
            }
        }

        var hasOverlap = await _dbContext.Rules
            .AnyAsync(existing => existing.ChildName == rule.ChildName
                && existing.Id != ignoreRuleId
                && rule.StartTime < existing.EndTime
                && existing.StartTime < rule.EndTime,
                cancellationToken);

        return hasOverlap
            ? new RuleValidationResult(false, "This child already has another rule that overlaps with the selected time range.")
            : new RuleValidationResult(true, null);
    }

    public async Task<RuleViolationStatusDto> EvaluateDeviceAsync(Device device, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(device.ChildName))
        {
            return new RuleViolationStatusDto
            {
                HasActiveRule = false,
                IsViolatingRule = false,
                Message = "Device is not paired with a child yet."
            };
        }

        var nowTime = TimeOnly.FromDateTime(DateTime.UtcNow);
        var activeRule = await _dbContext.Rules
            .AsNoTracking()
            .Where(rule => rule.ChildName == device.ChildName
                && rule.StartTime <= nowTime
                && nowTime <= rule.EndTime)
            .OrderBy(rule => rule.StartTimeUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeRule is null)
        {
            return new RuleViolationStatusDto
            {
                HasActiveRule = false,
                IsViolatingRule = false,
                Message = "No active rule is currently enforcing this device."
            };
        }

        if (device.Latitude is null || device.Longitude is null)
        {
            return new RuleViolationStatusDto
            {
                HasActiveRule = true,
                ActiveRuleId = activeRule.Id,
                IsViolatingRule = false,
                Message = "An active rule exists, but the device has no location to evaluate."
            };
        }

        var isInsideAllowedZone = activeRule.RuleType switch
        {
            RuleType.Circle => IsInsideCircle(device.Latitude.Value, device.Longitude.Value, activeRule),
            RuleType.Polygon => IsInsidePolygon(device.Latitude.Value, device.Longitude.Value, activeRule),
            _ => true
        };

        var isViolating = !isInsideAllowedZone;
        var message = isViolating
            ? $"Device is outside the active {activeRule.RuleType.ToString().ToLowerInvariant()} zone for {device.ChildName}."
            : "Device is inside the currently active rule zone.";

        if (isViolating)
        {
            await SaveViolationLogAsync(device, activeRule, message, cancellationToken);
        }

        return new RuleViolationStatusDto
        {
            HasActiveRule = true,
            ActiveRuleId = activeRule.Id,
            IsViolatingRule = isViolating,
            Message = message
        };
    }

    private async Task SaveViolationLogAsync(Device device, Rule rule, string message, CancellationToken cancellationToken)
    {
        var recentDuplicateExists = await _dbContext.ViolationLogs
            .AnyAsync(log => log.DeviceId == device.Id
                && log.RuleId == rule.Id
                && log.IsViolation
                && log.CheckedAtUtc >= DateTime.UtcNow.AddMinutes(-5), cancellationToken);

        if (recentDuplicateExists)
        {
            return;
        }

        _dbContext.ViolationLogs.Add(new ViolationLog
        {
            DeviceId = device.Id,
            RuleId = rule.Id,
            ChildName = device.ChildName ?? string.Empty,
            IsViolation = true,
            Message = message,
            CheckedAtUtc = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static bool IsInsideCircle(double latitude, double longitude, Rule rule)
    {
        if (rule.CenterLatitude is null || rule.CenterLongitude is null || rule.RadiusMeters is null)
        {
            return true;
        }

        const double earthRadiusMeters = 6_371_000;
        var deltaLatitude = DegreesToRadians(rule.CenterLatitude.Value - latitude);
        var deltaLongitude = DegreesToRadians(rule.CenterLongitude.Value - longitude);
        var a = Math.Sin(deltaLatitude / 2) * Math.Sin(deltaLatitude / 2)
                + Math.Cos(DegreesToRadians(latitude)) * Math.Cos(DegreesToRadians(rule.CenterLatitude.Value))
                * Math.Sin(deltaLongitude / 2) * Math.Sin(deltaLongitude / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        var distance = earthRadiusMeters * c;

        return distance <= rule.RadiusMeters.Value;
    }

    private static bool IsInsidePolygon(double latitude, double longitude, Rule rule)
    {
        var polygon = DeserializePolygon(rule.PolygonCoordinatesJson);
        if (polygon.Count < 3)
        {
            return true;
        }

        var inside = false;
        for (var i = 0; i < polygon.Count; i++)
        {
            var j = (i + polygon.Count - 1) % polygon.Count;
            var current = polygon[i];
            var previous = polygon[j];

            var intersects = ((current.Longitude > longitude) != (previous.Longitude > longitude))
                && (latitude < (previous.Latitude - current.Latitude) * (longitude - current.Longitude)
                    / ((previous.Longitude - current.Longitude) + double.Epsilon) + current.Latitude);

            if (intersects)
            {
                inside = !inside;
            }
        }

        return inside;
    }

    private static List<GeoPoint> DeserializePolygon(string? polygonJson)
    {
        if (string.IsNullOrWhiteSpace(polygonJson))
        {
            return [];
        }

        return JsonSerializer.Deserialize<List<GeoPoint>>(polygonJson) ?? [];
    }

    private static bool IsValidLatitude(double latitude) => latitude >= -90 && latitude <= 90;

    private static bool IsValidLongitude(double longitude) => longitude >= -180 && longitude <= 180;

    private static double DegreesToRadians(double degrees) => degrees * (Math.PI / 180);
}
