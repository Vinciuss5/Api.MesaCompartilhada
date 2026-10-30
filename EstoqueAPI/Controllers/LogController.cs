using EstoqueAPI.DTOs;
using EstoqueAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstoqueAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // Trilha de auditoria: visível apenas para administradores
    [Authorize(Roles = "ADMIN")]
    public class LogController : ControllerBase
    {
        private readonly ILogService _service;

        public LogController(ILogService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<LogResponseDTO>>> Get([FromQuery] int top = 100)
        {
            var logs = await _service.ListarAsync(top);
            return Ok(logs);
        }
    }
}
