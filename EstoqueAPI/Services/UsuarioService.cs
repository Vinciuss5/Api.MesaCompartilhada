using AutoMapper;
using EstoqueAPI.Data;
using EstoqueAPI.DTOs;
using EstoqueAPI.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace EstoqueAPI.Services
{
    public class UsuarioService : IUsuarioService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _config;
        private readonly IEmailService _emailService;
        private readonly ILogger<UsuarioService> _logger;

        // Injetamos IConfiguration para ler a chave secreta do JWT do appsettings.json
        public UsuarioService(AppDbContext context, IMapper mapper, IConfiguration config,
            IEmailService emailService, ILogger<UsuarioService> logger)
        {
            _context = context;
            _mapper = mapper;
            _config = config;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task<IEnumerable<UsuarioResponseDTO>> ListarTodosAsync()
        {
            // AsNoTracking para performance, já que é apenas leitura
            var usuarios = await _context.Usuarios.AsNoTracking().ToListAsync();
            return _mapper.Map<IEnumerable<UsuarioResponseDTO>>(usuarios);
        }

        public async Task<UsuarioResponseDTO?> BuscarPorIdAsync(int id)
        {
            var usuario = await _context.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
            return usuario == null ? null : _mapper.Map<UsuarioResponseDTO>(usuario);
        }

        public async Task<UsuarioResponseDTO> CriarAsync(UsuarioCreateDTO dto)
        {
            // Regra de Negócio: E-mail precisa ser único (cadastro simplificado sem CPF)
            var emailExiste = await _context.Usuarios.AnyAsync(u => u.Email == dto.Email);
            if (emailExiste)
                throw new InvalidOperationException("Este e-mail já está em uso no sistema.");

            var usuario = _mapper.Map<Usuario>(dto);

            // SEGURANÇA: BCrypt gera um "Salt" automático e hashea a senha.
            // NUNCA salvamos a senha em texto plano.
            usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha);
            usuario.Ativo = true;

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            // Retornamos o DTO de resposta que propositalmente NÃO contém a senha
            return _mapper.Map<UsuarioResponseDTO>(usuario);
        }

        public async Task<bool> AtualizarAsync(int id, UsuarioUpdateDTO dto)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return false;

            // Se o e-mail estiver sendo alterado, precisamos validar se o novo e-mail já não existe
            if (usuario.Email != dto.Email)
            {
                var emailExiste = await _context.Usuarios.AnyAsync(u => u.Email == dto.Email);
                if (emailExiste) throw new InvalidOperationException("O novo e-mail já está em uso.");
            }

            _mapper.Map(dto, usuario);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> InativarAsync(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return false;

            // Soft Delete: Apenas mudamos o status.
            // Se deletarmos fisicamente, quebraremos a integridade referencial se ele fez alguma ação no sistema (Logs).
            usuario.Ativo = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<(string Token, string Tipo)> LoginAsync(LoginDTO dto)
        {
            // Busca apenas usuários ativos
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Email == dto.Email && u.Ativo);

            // SEGURANÇA: Prevenção contra enumeração de usuários.
            // Se o e-mail não existe OU a senha está errada, a mensagem é a MESMA.
            // O BCrypt.Verify pega a senha digitada, aplica o Salt salvo no banco e compara os Hashes.
            if (usuario == null || !BCrypt.Net.BCrypt.Verify(dto.Senha, usuario.SenhaHash))
                throw new UnauthorizedAccessException("E-mail ou senha inválidos.");

            return (GerarTokenJwt(usuario), usuario.Tipo);
        }

        // --- RECUPERAÇÃO DE SENHA ("esqueci minha senha") ---

        public async Task SolicitarRecuperacaoAsync(string email, string urlFrontend)
        {
            // Silencioso por segurança: se o e-mail não existe, não revelamos isso
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Email == email && u.Ativo);
            if (usuario == null) return;

            // Invalida tokens anteriores não usados (um link válido por vez)
            var antigos = await _context.SenhaResetTokens
                .Where(t => t.UsuarioId == usuario.Id && !t.Usado)
                .ToListAsync();
            foreach (var t in antigos) t.Usado = true;

            // Token aleatório de 64 caracteres hexadecimais (256 bits)
            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

            _context.SenhaResetTokens.Add(new SenhaResetToken
            {
                Token = token,
                UsuarioId = usuario.Id,
                ExpiraEm = DateTime.UtcNow.AddMinutes(30)
            });
            await _context.SaveChangesAsync();

            var link = $"{urlFrontend.TrimEnd('/')}/redefinir-senha?token={token}";
            var corpo = $"""
                <p>Olá, {usuario.Nome}.</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema
                <b>Mesa Compartilhada</b>.</p>
                <p><a href="{link}">Clique aqui para criar uma nova senha</a> (válido por 30 minutos).</p>
                <p>Se você não pediu isso, ignore este e-mail — sua senha continua a mesma.</p>
                """;

            var enviado = await _emailService.EnviarAsync(usuario.Email, "Redefinição de senha — Mesa Compartilhada", corpo);

            // Sem SMTP configurado: registra o link no log do servidor para uso imediato
            if (!enviado)
                _logger.LogWarning(
                    "SMTP não configurado. Link de recuperação para {Email} (30 min): {Link}",
                    usuario.Email, link);
        }

        public async Task RedefinirSenhaAsync(string token, string novaSenha)
        {
            var registro = await _context.SenhaResetTokens
                .Include(t => t.Usuario)
                .FirstOrDefaultAsync(t => t.Token == token);

            if (registro == null || registro.Usado || registro.ExpiraEm < DateTime.UtcNow
                || registro.Usuario == null || !registro.Usuario.Ativo)
                throw new InvalidOperationException("Link de recuperação inválido ou expirado.");

            registro.Usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(novaSenha);
            registro.Usado = true;

            // Invalida qualquer outro token pendente do mesmo usuário
            var outros = await _context.SenhaResetTokens
                .Where(t => t.UsuarioId == registro.UsuarioId && !t.Usado && t.Id != registro.Id)
                .ToListAsync();
            foreach (var t in outros) t.Usado = true;

            await _context.SaveChangesAsync();
        }

        public async Task<bool> RedefinirSenhaPorAdminAsync(int id, string novaSenha)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return false;

            usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(novaSenha);
            await _context.SaveChangesAsync();
            return true;
        }

        // Método privado: A responsabilidade de gerar o token é interna deste serviço.
        private string GerarTokenJwt(Usuario usuario)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var chaveSecreta = _config["Jwt:Key"];

            if (string.IsNullOrEmpty(chaveSecreta))
                throw new Exception("Chave JWT não configurada no sistema.");

            var key = Encoding.ASCII.GetBytes(chaveSecreta);

            // Claims são as "afirmações" ou dados embutidos dentro do token
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                    new Claim(ClaimTypes.Name, usuario.Nome),
                    new Claim(ClaimTypes.Email, usuario.Email),
                    // Esta Claim é a chave para o Controle de Acesso (RBAC) nos Controllers
                    new Claim(ClaimTypes.Role, usuario.Tipo)
                }),
                Expires = DateTime.UtcNow.AddHours(8), // Token expira em 8 horas (jornada de trabalho)
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}