using System;
using System.Collections.Generic;

namespace BackEnd.Models;

public partial class Message
{
    public int MessageId { get; set; }

    public int FromUserId { get; set; }

    public int ToUserId { get; set; }

    public int? SubjectId { get; set; }

    public int? StudentId { get; set; }

    public string Kind { get; set; } = null!;

    public string Body { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public bool IsResolved { get; set; }

    public virtual User FromUser { get; set; } = null!;

    public virtual ICollection<MessageReply> MessageReplies { get; set; } = new List<MessageReply>();

    public virtual Student? Student { get; set; }

    public virtual Subject? Subject { get; set; }

    public virtual User ToUser { get; set; } = null!;
}
