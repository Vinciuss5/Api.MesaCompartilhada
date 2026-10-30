using EstoqueAPI.Data;
using EstoqueAPI.DTOs;
using EstoqueAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace EstoqueAPI.Services
{
    public class LogService : ILogService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LogService> _logger;

        public LogService(AppDbContext context, ILogger<LogService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task RegistrarAsync(int usuarioId, string acao)
        {
            try
            {
                _context.Logs.Add(new Logs
                {
                    UsuarioId = usuarioId,
                    Acao = acao.Length > 100 ? acao[..100] : acao,
                    DataHora = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Auditoria nunca pode quebrar a requisição principal
                _logger.LogError(ex, "Falha ao gravar log de auditoria para usuário {Id}.", usuarioId);
            }
        }

        public async Task<IEnumerable<LogResponseDTO>> ListarAsync(int top = 100)
        {
            var logs = await _context.Logs.AsNoTracking()
                .Include(l => l.Usuario)
                .OrderByDescending(l => l.DataHora)
                .Take(Math.Clamp(top, 1, 500))
                .ToListAsync();

            return logs.Select(l => new LogResponseDTO(
                l.Id,
                l.Usuario?.Nome ?? "Desconhecido",
                l.Usuario?.Email ?? "-",
                l.Acao,
                l.DataHora
            ));
        }
    }
}
