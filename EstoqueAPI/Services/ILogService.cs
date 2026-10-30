using EstoqueAPI.DTOs;

namespace EstoqueAPI.Services
{
    public interface ILogService
    {
        /// <summary>Registra uma ação do usuário (auditoria). Nunca lança exceção.</summary>
        Task RegistrarAsync(int usuarioId, string acao);

        /// <summary>Lista as últimas ações (mais recentes primeiro).</summary>
        Task<IEnumerable<LogResponseDTO>> ListarAsync(int top = 100);
    }
}
