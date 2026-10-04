using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class SchoolYear
{
    public int SchoolYearId { get; set; }

    public short StartYear { get; set; }

    public string Label { get; set; } = null!;

    public bool IsLocked { get; set; }

    public virtual ICollection<GradingPeriod> GradingPeriods { get; set; } = new List<GradingPeriod>();

    public virtual ICollection<TeachingAssignment> TeachingAssignments { get; set; } = new List<TeachingAssignment>();
}
