using AutoMapper;
using BackEnd.Data;
using BackEnd.DTOs;
using BackEnd.Models;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Services;

public sealed class StudentService(PedagoclickContext db, IMapper mapper) : IStudentService
{
    public async Task<IReadOnlyList<StudentResponse>> ListAsync(int sectionId, int userId, CancellationToken cancellationToken)
    {
        await EnsureAdviserAsync(sectionId, userId, cancellationToken);
        var students = await db.Students.AsNoTracking().Where(student => student.SectionId == sectionId)
            .OrderBy(student => student.FullName).ToListAsync(cancellationToken);
        return mapper.Map<List<StudentResponse>>(students);
    }

    public async Task<StudentResponse> CreateAsync(int sectionId, CreateStudentRequest request, int userId, CancellationToken cancellationToken)
    {
        await EnsureAdviserAsync(sectionId, userId, cancellationToken);
        if (!await db.Sections.AnyAsync(section => section.SectionId == sectionId, cancellationToken))
            throw new KeyNotFoundException("Section was not found.");
        if (await db.Students.AnyAsync(student => student.Lrn == request.Lrn.Trim(), cancellationToken))
            throw new ConflictException("A student with this LRN already exists.");
        var student = mapper.Map<Student>(request);
        student.Lrn = request.Lrn.Trim();
        student.SectionId = sectionId;
        db.Students.Add(student);
        await db.SaveChangesAsync(cancellationToken);
        return mapper.Map<StudentResponse>(student);
    }

    public async Task<StudentResponse> UpdateAsync(int id, UpdateStudentRequest request, int userId, CancellationToken cancellationToken)
    {
        var student = await db.Students.Include(value => value.Section).SingleOrDefaultAsync(value => value.StudentId == id, cancellationToken)
            ?? throw new KeyNotFoundException("Student was not found.");
        await EnsureAdviserAsync(student.SectionId, userId, cancellationToken);
        if (await db.Students.AnyAsync(value => value.Lrn == request.Lrn.Trim() && value.StudentId != id, cancellationToken))
            throw new ConflictException("A student with this LRN already exists.");
        student.Lrn = request.Lrn.Trim();
        student.FullName = request.FullName.Trim();
        await db.SaveChangesAsync(cancellationToken);
        return mapper.Map<StudentResponse>(student);
    }

    public async Task DeactivateAsync(int id, int userId, CancellationToken cancellationToken)
    {
        var student = await db.Students.SingleOrDefaultAsync(value => value.StudentId == id, cancellationToken)
            ?? throw new KeyNotFoundException("Student was not found.");
        await EnsureAdviserAsync(student.SectionId, userId, cancellationToken);
        student.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureAdviserAsync(int sectionId, int userId, CancellationToken cancellationToken)
    {
        var allowed = await db.Sections.AnyAsync(section => section.SectionId == sectionId && section.AdviserUserId == userId, cancellationToken);
        if (!allowed)
            throw new ForbiddenException("Only the assigned adviser can manage this section's students.");
    }
}
