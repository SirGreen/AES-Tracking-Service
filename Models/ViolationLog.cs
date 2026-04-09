using System.ComponentModel.DataAnnotations;

namespace BTL_AES.Models;

public class ViolationLog
{
    public int Id { get; set; }

    public int DeviceId { get; set; }

    public int RuleId { get; set; }

    [Required]
    [MaxLength(100)]
    public string ChildName { get; set; } = string.Empty;

    public bool IsViolation { get; set; }

    [Required]
    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    public DateTime CheckedAtUtc { get; set; } = DateTime.UtcNow;

    public Device? Device { get; set; }

    public Rule? Rule { get; set; }
}
