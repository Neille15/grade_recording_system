using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class AuditLog
{
    public long AuditLogId { get; set; }

    public int? UserId { get; set; }

    public string Action { get; set; } = null!;

    public string Detail { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual User? User { get; set; }
}
