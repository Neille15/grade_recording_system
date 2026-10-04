using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class GradingPeriod
{
    public int GradingPeriodId { get; set; }

    public int SchoolYearId { get; set; }

    public byte Quarter { get; set; }

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public bool IsOpen { get; set; }

    public virtual ICollection<GradeItem> GradeItems { get; set; } = new List<GradeItem>();

    public virtual SchoolYear SchoolYear { get; set; } = null!;
}
