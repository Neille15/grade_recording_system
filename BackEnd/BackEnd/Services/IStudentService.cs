using BackEnd.DTOs;

namespace BackEnd.Services;

public interface IStudentService
{
    Task<IReadOnlyList<StudentResponse>> ListAsync(int sectionId, int userId, CancellationToken cancellationToken);
    Task<StudentResponse> CreateAsync(int sectionId, CreateStudentRequest request, int userId, CancellationToken cancellationToken);
    Task<StudentResponse> UpdateAsync(int id, UpdateStudentRequest request, int userId, CancellationToken cancellationToken);
    Task DeactivateAsync(int id, int userId, CancellationToken cancellationToken);
}
