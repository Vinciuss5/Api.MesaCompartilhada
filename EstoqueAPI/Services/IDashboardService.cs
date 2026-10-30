using EstoqueAPI.DTOs;

namespace EstoqueAPI.Services
{
    public interface IDashboardService
    {
        /// <summary>
        /// KPIs do painel, filtrados pelo perfil do usuário
        /// (ADMIN vê tudo; CADASTRO vê cadastros/movimento; FUNCIONARIO vê só estoque).
        /// </summary>
        Task<DashboardResponseDTO> ObterAsync(string tipoPerfil);
    }
}
