using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class GradeItem
{
    public int GradeItemId { get; set; }

    public int AssignmentId { get; set; }

    public int GradingPeriodId { get; set; }

    public string Component { get; set; } = null!;

    public byte ItemNo { get; set; }

    public decimal MaxScore { get; set; }

    public virtual TeachingAssignment Assignment { get; set; } = null!;

    public virtual GradingPeriod GradingPeriod { get; set; } = null!;

    public virtual ICollection<Score> Scores { get; set; } = new List<Score>();
}
