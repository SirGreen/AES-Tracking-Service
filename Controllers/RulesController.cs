using System.Text.Json;
using BTL_AES.Data;
using BTL_AES.Dtos;
using BTL_AES.Models;
using BTL_AES.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BTL_AES.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RulesController(AppDbContext dbContext, IRuleEvaluationService ruleEvaluationService) : ControllerBase
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IRuleEvaluationService _ruleEvaluationService = ruleEvaluationService;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<RuleResponse>>> GetRules([FromQuery] string? childName, CancellationToken cancellationToken)
    {
        var query = _dbContext.Rules
            .AsNoTracking()
            .OrderBy(rule => rule.StartTime)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(childName))
        {
            query = query.Where(rule => rule.ChildName == childName.Trim());
        }

        var rules = await query.ToListAsync(cancellationToken);
        return Ok(rules.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RuleResponse>> GetRule(int id, CancellationToken cancellationToken)
    {
        var rule = await _dbContext.Rules
            .AsNoTracking()
            .FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);

        if (rule is null)
        {
            return NotFound(new { message = $"Rule with id {id} was not found." });
        }

        return Ok(ToResponse(rule));
    }

    [HttpPost]
    public async Task<ActionResult<RuleResponse>> CreateRule([FromBody] CreateRuleRequest request, CancellationToken cancellationToken)
    {
        var rule = new Rule
        {
            Name = request.Name.Trim(),
            ChildName = request.ChildName.Trim(),
            RuleType = request.RuleType,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            CenterLatitude = request.CenterLatitude,
            CenterLongitude = request.CenterLongitude,
            RadiusMeters = request.RadiusMeters,
            PolygonCoordinatesJson = SerializePolygon(request.PolygonCoordinates),
            CreatedAtUtc = DateTime.UtcNow
        };

        var validation = await _ruleEvaluationService.ValidateRuleAsync(rule, cancellationToken: cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(new { message = validation.ErrorMessage });
        }

        _dbContext.Rules.Add(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetRule), new { id = rule.Id }, ToResponse(rule));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RuleResponse>> UpdateRule(int id, [FromBody] UpdateRuleRequest request, CancellationToken cancellationToken)
    {
        var rule = await _dbContext.Rules.FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);
        if (rule is null)
        {
            return NotFound(new { message = $"Rule with id {id} was not found." });
        }

        rule.Name = request.Name.Trim();
        rule.ChildName = request.ChildName.Trim();
        rule.RuleType = request.RuleType;
        rule.StartTime = request.StartTime;
        rule.EndTime = request.EndTime;
        rule.CenterLatitude = request.CenterLatitude;
        rule.CenterLongitude = request.CenterLongitude;
        rule.RadiusMeters = request.RadiusMeters;
        rule.PolygonCoordinatesJson = SerializePolygon(request.PolygonCoordinates);

        var validation = await _ruleEvaluationService.ValidateRuleAsync(rule, id, cancellationToken);
        if (!validation.IsValid)
        {
            return BadRequest(new { message = validation.ErrorMessage });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ToResponse(rule));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRule(int id, CancellationToken cancellationToken)
    {
        var rule = await _dbContext.Rules.FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);
        if (rule is null)
        {
            return NotFound(new { message = $"Rule with id {id} was not found." });
        }

        _dbContext.Rules.Remove(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static RuleResponse ToResponse(Rule rule) => new()
    {
        Id = rule.Id,
        Name = rule.Name,
        ChildName = rule.ChildName,
        RuleType = rule.RuleType,
        StartTime = rule.StartTime,
        EndTime = rule.EndTime,
        CenterLatitude = rule.CenterLatitude,
        CenterLongitude = rule.CenterLongitude,
        RadiusMeters = rule.RadiusMeters,
        PolygonCoordinates = DeserializePolygon(rule.PolygonCoordinatesJson),
        CreatedAtUtc = rule.CreatedAtUtc
    };

    private static string? SerializePolygon(List<GeoPoint>? polygonCoordinates)
    {
        if (polygonCoordinates is null || polygonCoordinates.Count == 0)
        {
            return null;
        }

        return JsonSerializer.Serialize(polygonCoordinates);
    }

    private static List<GeoPoint>? DeserializePolygon(string? polygonCoordinatesJson)
    {
        if (string.IsNullOrWhiteSpace(polygonCoordinatesJson))
        {
            return null;
        }

        return JsonSerializer.Deserialize<List<GeoPoint>>(polygonCoordinatesJson) ?? [];
    }
}
