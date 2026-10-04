using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class TeachingAssignment
{
    public int AssignmentId { get; set; }

    public int SchoolYearId { get; set; }

    public int SectionId { get; set; }

    public int SubjectId { get; set; }

    public int TeacherUserId { get; set; }

    public virtual ICollection<GradeItem> GradeItems { get; set; } = new List<GradeItem>();

    public virtual SchoolYear SchoolYear { get; set; } = null!;

    public virtual Section Section { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;

    public virtual User TeacherUser { get; set; } = null!;
}
