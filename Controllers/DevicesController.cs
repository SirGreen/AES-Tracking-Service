using BTL_AES.Data;
using BTL_AES.Dtos;
using BTL_AES.Models;
using BTL_AES.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTL_AES.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DevicesController(AppDbContext dbContext, IRuleEvaluationService ruleEvaluationService) : ControllerBase
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IRuleEvaluationService _ruleEvaluationService = ruleEvaluationService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DeviceResponse>>> GetDevices(CancellationToken cancellationToken)
    {
        var devices = await _dbContext.Devices
            .AsNoTracking()
            .OrderBy(device => device.Id)
            .ToListAsync(cancellationToken);

        var response = new List<DeviceResponse>(devices.Count);
        foreach (var device in devices)
        {
            var ruleStatus = await _ruleEvaluationService.EvaluateDeviceAsync(device, cancellationToken);
            response.Add(ToResponse(device, ruleStatus));
        }

        return Ok(response);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DeviceResponse>> GetDevice(int id, CancellationToken cancellationToken)
    {
        var device = await _dbContext.Devices
            .AsNoTracking()
            .FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);

        if (device is null)
        {
            return NotFound(new { message = $"Device with id {id} was not found." });
        }

        var ruleStatus = await _ruleEvaluationService.EvaluateDeviceAsync(device, cancellationToken);
        return Ok(ToResponse(device, ruleStatus));
    }

    [HttpPost]
    public async Task<ActionResult<DeviceResponse>> CreateDevice([FromBody] CreateDeviceRequest request, CancellationToken cancellationToken)
    {
        var locationError = ValidateCoordinates(request.Latitude, request.Longitude);
        if (locationError is not null)
        {
            return BadRequest(new { message = locationError });
        }

        var alreadyExists = await _dbContext.Devices
            .AnyAsync(existing => existing.DeviceIdentifier == request.DeviceIdentifier, cancellationToken);

        if (alreadyExists)
        {
            return Conflict(new { message = "A device with this device identifier already exists." });
        }

        var device = new Device
        {
            DeviceIdentifier = request.DeviceIdentifier.Trim(),
            ChildName = string.IsNullOrWhiteSpace(request.ChildName) ? null : request.ChildName.Trim(),
            BatteryPercent = request.BatteryPercent,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _dbContext.Devices.Add(device);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var ruleStatus = await _ruleEvaluationService.EvaluateDeviceAsync(device, cancellationToken);
        return CreatedAtAction(nameof(GetDevice), new { id = device.Id }, ToResponse(device, ruleStatus));
    }

    [HttpPost("pair")]
    public async Task<ActionResult<DeviceResponse>> PairDevice([FromBody] PairDeviceRequest request, CancellationToken cancellationToken)
    {
        var locationError = ValidateCoordinates(request.Latitude, request.Longitude);
        if (locationError is not null)
        {
            return BadRequest(new { message = locationError });
        }

        var device = await _dbContext.Devices
            .FirstOrDefaultAsync(existing => existing.DeviceIdentifier == request.DeviceIdentifier, cancellationToken);

        var isNew = false;
        if (device is null)
        {
            device = new Device
            {
                DeviceIdentifier = request.DeviceIdentifier.Trim(),
                CreatedAtUtc = DateTime.UtcNow
            };

            _dbContext.Devices.Add(device);
            isNew = true;
        }

        device.ChildName = request.ChildName.Trim();
        device.BatteryPercent = request.BatteryPercent;
        device.Latitude = request.Latitude;
        device.Longitude = request.Longitude;
        device.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var ruleStatus = await _ruleEvaluationService.EvaluateDeviceAsync(device, cancellationToken);
        var response = ToResponse(device, ruleStatus);

        if (isNew)
        {
            return CreatedAtAction(nameof(GetDevice), new { id = device.Id }, response);
        }

        return Ok(response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DeviceResponse>> UpdateDevice(int id, [FromBody] UpdateDeviceRequest request, CancellationToken cancellationToken)
    {
        var locationError = ValidateCoordinates(request.Latitude, request.Longitude);
        if (locationError is not null)
        {
            return BadRequest(new { message = locationError });
        }

        var device = await _dbContext.Devices.FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);
        if (device is null)
        {
            return NotFound(new { message = $"Device with id {id} was not found." });
        }

        var duplicateIdentifierExists = await _dbContext.Devices
            .AnyAsync(existing => existing.Id != id && existing.DeviceIdentifier == request.DeviceIdentifier, cancellationToken);

        if (duplicateIdentifierExists)
        {
            return Conflict(new { message = "Another device already uses this device identifier." });
        }

        device.DeviceIdentifier = request.DeviceIdentifier.Trim();
        device.ChildName = string.IsNullOrWhiteSpace(request.ChildName) ? null : request.ChildName.Trim();
        device.BatteryPercent = request.BatteryPercent;
        device.Latitude = request.Latitude;
        device.Longitude = request.Longitude;
        device.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var ruleStatus = await _ruleEvaluationService.EvaluateDeviceAsync(device, cancellationToken);
        return Ok(ToResponse(device, ruleStatus));
    }

    [HttpPatch("{id:int}/location")]
    public async Task<ActionResult<DeviceResponse>> UpdateLocation(int id, [FromBody] UpdateDeviceLocationRequest request, CancellationToken cancellationToken)
    {
        var device = await _dbContext.Devices.FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);
        if (device is null)
        {
            return NotFound(new { message = $"Device with id {id} was not found." });
        }

        device.Latitude = request.Latitude;
        device.Longitude = request.Longitude;
        if (request.BatteryPercent.HasValue)
        {
            device.BatteryPercent = request.BatteryPercent.Value;
        }

        device.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var ruleStatus = await _ruleEvaluationService.EvaluateDeviceAsync(device, cancellationToken);
        return Ok(ToResponse(device, ruleStatus));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDevice(int id, CancellationToken cancellationToken)
    {
        var device = await _dbContext.Devices.FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);
        if (device is null)
        {
            return NotFound(new { message = $"Device with id {id} was not found." });
        }

        _dbContext.Devices.Remove(device);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static DeviceResponse ToResponse(Device device, RuleViolationStatusDto ruleStatus) => new()
    {
        Id = device.Id,
        DeviceIdentifier = device.DeviceIdentifier,
        ChildName = device.ChildName,
        BatteryPercent = device.BatteryPercent,
        Latitude = device.Latitude,
        Longitude = device.Longitude,
        CreatedAtUtc = device.CreatedAtUtc,
        UpdatedAtUtc = device.UpdatedAtUtc,
        RuleStatus = ruleStatus
    };

    private static string? ValidateCoordinates(double? latitude, double? longitude)
    {
        if (latitude.HasValue != longitude.HasValue)
        {
            return "Latitude and longitude must be provided together.";
        }

        if (latitude.HasValue && (latitude.Value < -90 || latitude.Value > 90))
        {
            return "Latitude must be between -90 and 90.";
        }

        if (longitude.HasValue && (longitude.Value < -180 || longitude.Value > 180))
        {
            return "Longitude must be between -180 and 180.";
        }

        return null;
    }
}
