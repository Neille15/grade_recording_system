using AutoMapper;
using BackEnd.DTOs;
using BackEnd.Models;

namespace BackEnd.Mappings;

public sealed class AuthMappingProfile : Profile
{
    public AuthMappingProfile()
    {
        CreateMap<User, UserResponse>()
            .ForCtorParam("Role", options => options.MapFrom(source => source.UserRole));
        CreateMap<RegisterRequest, User>()
            .ForMember(destination => destination.UserRole, options => options.MapFrom(source => source.Role))
            .ForMember(destination => destination.Status, options => options.MapFrom(_ => "Pending"))
            .ForMember(destination => destination.PasswordHash, options => options.Ignore());
    }
}
