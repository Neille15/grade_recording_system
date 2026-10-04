using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class Student
{
    public int StudentId { get; set; }

    public string Lrn { get; set; } = null!;

    public string FullName { get; set; } = null!;

    public int SectionId { get; set; }

    public bool IsActive { get; set; }

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();

    public virtual ICollection<Score> Scores { get; set; } = new List<Score>();

    public virtual Section Section { get; set; } = null!;
}
