using BTL_AES.Dtos;
using BTL_AES.Models;

namespace BTL_AES.Services;

public interface IRuleEvaluationService
{
    Task<RuleValidationResult> ValidateRuleAsync(Rule rule, int? ignoreRuleId = null, CancellationToken cancellationToken = default);

    Task<RuleViolationStatusDto> EvaluateDeviceAsync(Device device, CancellationToken cancellationToken = default);
}

public sealed record RuleValidationResult(bool IsValid, string? ErrorMessage);
