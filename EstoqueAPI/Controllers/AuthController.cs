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
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;

        // Injeção de Dependência: O framework entrega a instância do serviço pronta para uso
        public AuthController(IUsuarioService usuarioService, IConfiguration config, IWebHostEnvironment env)
        {
            _usuarioService = usuarioService;
            _config = config;
            _env = env;
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

        /// <summary>
        /// Solicita a recuperação de senha. SEMPRE responde de forma genérica
        /// para não revelar se o e-mail existe no sistema.
        /// </summary>
        [HttpPost("esqueci-senha")]
        public async Task<IActionResult> EsqueciSenha([FromBody] EsqueciSenhaDTO dto)
        {
            try
            {
                var urlFrontend = DefinirUrlFrontend();
                await _usuarioService.SolicitarRecuperacaoAsync(dto.Email, urlFrontend);

                return Ok(new
                {
                    message = "Se o e-mail estiver cadastrado, enviaremos as instruções de redefinição de senha."
                });
            }
            catch (Exception)
            {
                // Mesmo em erro interno respondemos 200: não podemos vazar se o e-mail existe
                return Ok(new
                {
                    message = "Se o e-mail estiver cadastrado, enviaremos as instruções de redefinição de senha."
                });
            }
        }

        /// <summary>
        /// Redefine a senha usando o token recebido por e-mail.
        /// </summary>
        [HttpPost("redefinir-senha")]
        public async Task<IActionResult> RedefinirSenha([FromBody] RedefinirSenhaDTO dto)
        {
            try
            {
                await _usuarioService.RedefinirSenhaAsync(dto.Token, dto.NovaSenha);
                return Ok(new { message = "Senha redefinida com sucesso. Já pode entrar no sistema." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = "Erro interno ao redefinir a senha." });
            }
        }

        /// <summary>
        /// Base do frontend para os links de recuperação:
        /// configurável via App:FrontendUrl; em desenvolvimento usa o Vite (5173);
        /// em produção o React é servido pela própria API (mesmo host).
        /// </summary>
        private string DefinirUrlFrontend()
        {
            var configurada = _config["App:FrontendUrl"];
            if (!string.IsNullOrWhiteSpace(configurada))
                return configurada;

            if (_env.IsDevelopment())
                return "http://localhost:5173";

            // Em produção o Render encerra TLS no proxy: o site é https
            return $"https://{Request.Host}";
        }
    }
}