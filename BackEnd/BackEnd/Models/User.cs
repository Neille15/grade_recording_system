using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class User
{
    public int UserId { get; set; }

    public string FullName { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string UserRole { get; set; } = null!;

    public string? Title { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Message> MessageFromUsers { get; set; } = new List<Message>();

    public virtual ICollection<MessageReply> MessageReplies { get; set; } = new List<MessageReply>();

    public virtual ICollection<Message> MessageToUsers { get; set; } = new List<Message>();

    public virtual ICollection<Score> Scores { get; set; } = new List<Score>();

    public virtual ICollection<Section> Sections { get; set; } = new List<Section>();

    public virtual ICollection<TeachingAssignment> TeachingAssignments { get; set; } = new List<TeachingAssignment>();
}
