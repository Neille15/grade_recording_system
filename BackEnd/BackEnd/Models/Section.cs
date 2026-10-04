using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class Section
{
    public int SectionId { get; set; }

    public byte GradeLevel { get; set; }

    public string SectionName { get; set; } = null!;

    public int? AdviserUserId { get; set; }

    public virtual User? AdviserUser { get; set; }

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();

    public virtual ICollection<TeachingAssignment> TeachingAssignments { get; set; } = new List<TeachingAssignment>();
}
