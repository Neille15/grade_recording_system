using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs;

/// <summary>Payload for adding a student to a section.</summary>
public sealed record CreateStudentRequest
{
    [Required, MaxLength(20)] public required string Lrn { get; init; }
    [Required, MaxLength(150)] public required string FullName { get; init; }
}

/// <summary>Payload for updating a student record.</summary>
public sealed record UpdateStudentRequest
{
    [Required, MaxLength(20)] public required string Lrn { get; init; }
    [Required, MaxLength(150)] public required string FullName { get; init; }
}

/// <summary>Student information returned by the API.</summary>
public sealed record StudentResponse(int StudentId, string Lrn, string FullName, int SectionId, bool IsActive);
