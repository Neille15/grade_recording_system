using System;
using System.Collections.Generic;
using BackEnd.Models;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Data;

public partial class PedagoclickContext : DbContext
{
    public PedagoclickContext(DbContextOptions<PedagoclickContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<GradeItem> GradeItems { get; set; }

    public virtual DbSet<GradingPeriod> GradingPeriods { get; set; }

    public virtual DbSet<Message> Messages { get; set; }

    public virtual DbSet<MessageReply> MessageReplies { get; set; }

    public virtual DbSet<SchoolYear> SchoolYears { get; set; }

    public virtual DbSet<Score> Scores { get; set; }

    public virtual DbSet<Section> Sections { get; set; }

    public virtual DbSet<Student> Students { get; set; }

    public virtual DbSet<Subject> Subjects { get; set; }

    public virtual DbSet<TeachingAssignment> TeachingAssignments { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasIndex(e => e.CreatedAt, "IX_AuditLogs_CreatedAt");

            entity.Property(e => e.Action).HasMaxLength(30);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_AuditLogs_CreatedAt");
            entity.Property(e => e.Detail).HasMaxLength(500);

            entity.HasOne(d => d.User).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AuditLogs_Users");
        });

        modelBuilder.Entity<GradeItem>(entity =>
        {
            entity.HasIndex(e => new { e.AssignmentId, e.GradingPeriodId, e.Component, e.ItemNo }, "UQ_GradeItems").IsUnique();

            entity.Property(e => e.Component)
                .HasMaxLength(2)
                .IsUnicode(false)
                .IsFixedLength();
            entity.Property(e => e.MaxScore).HasColumnType("decimal(6, 2)");

            entity.HasOne(d => d.Assignment).WithMany(p => p.GradeItems)
                .HasForeignKey(d => d.AssignmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GradeItems_Assignments");

            entity.HasOne(d => d.GradingPeriod).WithMany(p => p.GradeItems)
                .HasForeignKey(d => d.GradingPeriodId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GradeItems_Periods");
        });

        modelBuilder.Entity<GradingPeriod>(entity =>
        {
            entity.HasIndex(e => new { e.SchoolYearId, e.Quarter }, "UQ_GradingPeriods_Year_Quarter").IsUnique();

            entity.HasOne(d => d.SchoolYear).WithMany(p => p.GradingPeriods)
                .HasForeignKey(d => d.SchoolYearId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GradingPeriods_SchoolYears");
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasIndex(e => e.FromUserId, "IX_Messages_FromUserId");

            entity.HasIndex(e => e.ToUserId, "IX_Messages_ToUserId");

            entity.Property(e => e.Body).HasMaxLength(2000);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Messages_CreatedAt");
            entity.Property(e => e.Kind)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.HasOne(d => d.FromUser).WithMany(p => p.MessageFromUsers)
                .HasForeignKey(d => d.FromUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Messages_From");

            entity.HasOne(d => d.Student).WithMany(p => p.Messages)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("FK_Messages_Students");

            entity.HasOne(d => d.Subject).WithMany(p => p.Messages)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("FK_Messages_Subjects");

            entity.HasOne(d => d.ToUser).WithMany(p => p.MessageToUsers)
                .HasForeignKey(d => d.ToUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Messages_To");
        });

        modelBuilder.Entity<MessageReply>(entity =>
        {
            entity.HasKey(e => e.ReplyId);

            entity.HasIndex(e => e.MessageId, "IX_MessageReplies_MessageId");

            entity.Property(e => e.Body).HasMaxLength(2000);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_MessageReplies_CreatedAt");

            entity.HasOne(d => d.Message).WithMany(p => p.MessageReplies)
                .HasForeignKey(d => d.MessageId)
                .HasConstraintName("FK_MessageReplies_Messages");

            entity.HasOne(d => d.User).WithMany(p => p.MessageReplies)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MessageReplies_Users");
        });

        modelBuilder.Entity<SchoolYear>(entity =>
        {
            entity.HasIndex(e => e.StartYear, "UQ_SchoolYears_StartYear").IsUnique();

            entity.Property(e => e.Label)
                .HasMaxLength(9)
                .HasComputedColumnSql("(concat(CONVERT([nvarchar](4),[StartYear]),nchar((8211)),CONVERT([nvarchar](4),[StartYear]+(1))))", false);
        });

        modelBuilder.Entity<Score>(entity =>
        {
            entity.HasIndex(e => e.StudentId, "IX_Scores_StudentId");

            entity.HasIndex(e => new { e.GradeItemId, e.StudentId }, "UQ_Scores_Item_Student").IsUnique();

            entity.Property(e => e.Score1)
                .HasColumnType("decimal(6, 2)")
                .HasColumnName("Score");
            entity.Property(e => e.SyncStatus)
                .HasMaxLength(10)
                .IsUnicode(false)
                .HasDefaultValue("synced", "DF_Scores_SyncStatus");
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Scores_UpdatedAt");

            entity.HasOne(d => d.GradeItem).WithMany(p => p.Scores)
                .HasForeignKey(d => d.GradeItemId)
                .HasConstraintName("FK_Scores_GradeItems");

            entity.HasOne(d => d.Student).WithMany(p => p.Scores)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Scores_Students");

            entity.HasOne(d => d.UpdatedByUser).WithMany(p => p.Scores)
                .HasForeignKey(d => d.UpdatedByUserId)
                .HasConstraintName("FK_Scores_Users");
        });

        modelBuilder.Entity<Section>(entity =>
        {
            entity.HasIndex(e => new { e.GradeLevel, e.SectionName }, "UQ_Sections_Grade_Name").IsUnique();

            entity.Property(e => e.SectionName).HasMaxLength(50);

            entity.HasOne(d => d.AdviserUser).WithMany(p => p.Sections)
                .HasForeignKey(d => d.AdviserUserId)
                .HasConstraintName("FK_Sections_Users");
        });

        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasIndex(e => e.SectionId, "IX_Students_SectionId");

            entity.HasIndex(e => e.Lrn, "UQ_Students_Lrn").IsUnique();

            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.IsActive).HasDefaultValue(true, "DF_Students_IsActive");
            entity.Property(e => e.Lrn).HasMaxLength(20);

            entity.HasOne(d => d.Section).WithMany(p => p.Students)
                .HasForeignKey(d => d.SectionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Students_Sections");
        });

        modelBuilder.Entity<Subject>(entity =>
        {
            entity.HasIndex(e => e.Name, "UQ_Subjects_Name").IsUnique();

            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<TeachingAssignment>(entity =>
        {
            entity.HasKey(e => e.AssignmentId);

            entity.HasIndex(e => e.TeacherUserId, "IX_TeachingAssignments_Teacher");

            entity.HasIndex(e => new { e.SchoolYearId, e.SectionId, e.SubjectId }, "UQ_TeachingAssignments").IsUnique();

            entity.HasOne(d => d.SchoolYear).WithMany(p => p.TeachingAssignments)
                .HasForeignKey(d => d.SchoolYearId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TeachingAssignments_SchoolYears");

            entity.HasOne(d => d.Section).WithMany(p => p.TeachingAssignments)
                .HasForeignKey(d => d.SectionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TeachingAssignments_Sections");

            entity.HasOne(d => d.Subject).WithMany(p => p.TeachingAssignments)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TeachingAssignments_Subjects");

            entity.HasOne(d => d.TeacherUser).WithMany(p => p.TeachingAssignments)
                .HasForeignKey(d => d.TeacherUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TeachingAssignments_Users");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email, "UQ_Users_Email").IsUnique();

            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Users_CreatedAt");
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.FullName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).HasMaxLength(500);
            entity.Property(e => e.Status)
                .HasMaxLength(10)
                .IsUnicode(false)
                .HasDefaultValue("Pending", "DF_Users_Status");
            entity.Property(e => e.Title).HasMaxLength(100);
            entity.Property(e => e.UserRole)
                .HasMaxLength(10)
                .IsUnicode(false);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
