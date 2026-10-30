using EstoqueAPI.DTOs;
using EstoqueAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EstoqueAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // Todos os perfis autenticados veem o painel (o service filtra o que cada um pode ver)
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _service;

        public DashboardController(IDashboardService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<DashboardResponseDTO>> Get()
        {
            var perfil = User.FindFirstValue(ClaimTypes.Role) ?? "FUNCIONARIO";
            var dashboard = await _service.ObterAsync(perfil);
            return Ok(dashboard);
        }
    }
}
