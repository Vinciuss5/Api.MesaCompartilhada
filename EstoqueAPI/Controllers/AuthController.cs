using EstoqueAPI.DTOs;
using EstoqueAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace EstoqueAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUsuarioService _usuarioService;

        // Injeção de Dependência: O framework entrega a instância do serviço pronta para uso
        public AuthController(IUsuarioService usuarioService)
        {
            _usuarioService = usuarioService;
        }

        /// <summary>
        /// Autentica um usuário e retorna um Token JWT.
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO dto)
        {
            try
            {
                // Delegamos toda a complexidade para o Service
                var (token, tipo) = await _usuarioService.LoginAsync(dto);

                // Retornamos token + tipo (o tipo define as telas/permissões no front-end)
                // O front-end vai ler isso e salvar no LocalStorage ou SessionStorage.
                return Ok(new { token, tipo });
            }
            catch (UnauthorizedAccessException ex)
            {
                // Segurança: Se cair aqui, a senha ou e-mail estavam errados.
                // O status HTTP correto para falha de autenticação é 401 Unauthorized.
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // Qualquer outro erro inesperado (ex: banco fora do ar)
                // O status HTTP correto é 500 Internal Server Error
                return StatusCode(500, new { message = "Erro interno no servidor.", detalhes = ex.Message });
            }
        }
    }
}