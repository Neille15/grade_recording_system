using System.Security.Claims;
using BackEnd.DTOs;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Controllers;

[ApiController, Authorize(Roles = "teacher,adviser"), Route("api/students")]
public sealed class StudentsController(IStudentService service) : ControllerBase
{
    [HttpGet("section/{sectionId:int}")]
    public async Task<ActionResult<IReadOnlyList<StudentResponse>>> List(int sectionId, CancellationToken cancellationToken)
        => Ok(await service.ListAsync(sectionId, CurrentUserId(), cancellationToken));

    [HttpPost("section/{sectionId:int}")]
    public async Task<ActionResult<StudentResponse>> Create(int sectionId, CreateStudentRequest request, CancellationToken cancellationToken)
    {
        var response = await service.CreateAsync(sectionId, request, CurrentUserId(), cancellationToken);
        return CreatedAtAction(nameof(List), new { sectionId }, response);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<StudentResponse>> Update(int id, UpdateStudentRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateAsync(id, request, CurrentUserId(), cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken cancellationToken)
    {
        await service.DeactivateAsync(id, CurrentUserId(), cancellationToken);
        return NoContent();
    }

    private int CurrentUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
