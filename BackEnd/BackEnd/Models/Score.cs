using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class Score
{
    public int ScoreId { get; set; }

    public int GradeItemId { get; set; }

    public int StudentId { get; set; }

    public decimal? Score1 { get; set; }

    public string SyncStatus { get; set; } = null!;

    public int? UpdatedByUserId { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual GradeItem GradeItem { get; set; } = null!;

    public virtual Student Student { get; set; } = null!;

    public virtual User? UpdatedByUser { get; set; }
}
