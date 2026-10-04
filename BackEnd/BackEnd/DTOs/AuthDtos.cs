using System.ComponentModel.DataAnnotations;

namespace BackEnd.DTOs;

/// <summary>Payload for creating a pending teacher or adviser account.</summary>
public sealed record RegisterRequest
{
    [Required, MaxLength(100)] public required string FullName { get; init; }
    [Required, EmailAddress, MaxLength(256)] public required string Email { get; init; }
    [Required, MinLength(8)] public required string Password { get; init; }
    [Required, RegularExpression("^(teacher|adviser)$")] public required string Role { get; init; }
    [MaxLength(100)] public string? Title { get; init; }
}

/// <summary>Payload for signing in with email and password.</summary>
public sealed record LoginRequest
{
    [Required, EmailAddress] public required string Email { get; init; }
    [Required] public required string Password { get; init; }
}

/// <summary>Safe user information returned by the API.</summary>
public sealed record UserResponse(int UserId, string FullName, string Email, string Role, string? Title, string Status);

/// <summary>Authentication result containing a bearer token and current user.</summary>
public sealed record LoginResponse(string AccessToken, UserResponse User);
