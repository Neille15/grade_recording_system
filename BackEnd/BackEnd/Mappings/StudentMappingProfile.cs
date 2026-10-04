using AutoMapper;
using BackEnd.DTOs;
using BackEnd.Models;

namespace BackEnd.Mappings;

public sealed class StudentMappingProfile : Profile
{
    public StudentMappingProfile()
    {
        CreateMap<Student, StudentResponse>();
        CreateMap<CreateStudentRequest, Student>();
        CreateMap<UpdateStudentRequest, Student>();
    }
}
