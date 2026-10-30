using EstoqueAPI.Data;
using EstoqueAPI.DTOs;
using Microsoft.EntityFrameworkCore;

namespace EstoqueAPI.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly AppDbContext _context;

        public DashboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardResponseDTO> ObterAsync(string tipoPerfil)
        {
            var agora = DateTime.UtcNow;
            var inicioMes = new DateTime(agora.Year, agora.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var hoje = agora.Date;
            var limite30 = hoje.AddDays(30);

            // --- Perfil só-estoque (FUNCIONARIO): não expõe cadastros/movimento ---
            if (tipoPerfil == "FUNCIONARIO")
            {
                var stats = await EstoqueStatsAsync(hoje, limite30);
                return new DashboardResponseDTO(
                    0, 0, 0, 0,
                    0, 0, 0, 0,
                    stats.Kg, stats.Baixo, stats.Vencendo30, stats.Vencidos,
                    new List<SolicitacaoResumoDTO>()
                );
            }

            // --- CADASTRO: cadastros + movimento (sem detalhes de estoque) ---
            var doadoresAtivos = await _context.Doadores.CountAsync(d => d.Ativo);
            var doadoresTotal = await _context.Doadores.CountAsync();
            var solicitantesAtivos = await _context.Solicitantes.CountAsync(s => s.Ativo);
            var solicitantesTotal = await _context.Solicitantes.CountAsync();

            var solicitacoesPendentes = await _context.Solicitacoes.CountAsync(s => s.Status == "PENDENTE");
            var solicitacoesMes = await _context.Solicitacoes.CountAsync(s => s.DataSolicitacao >= inicioMes);
            var solicitacoesEntreguesMes = await _context.Solicitacoes
                .CountAsync(s => s.Status == "ENTREGUE" && s.DataSolicitacao >= inicioMes);
            var doacoesMes = await _context.Doacoes.CountAsync(d => d.Data >= inicioMes);

            if (tipoPerfil != "ADMIN")
            {
                return new DashboardResponseDTO(
                    doadoresAtivos, doadoresTotal,
                    solicitantesAtivos, solicitantesTotal,
                    solicitacoesPendentes, solicitacoesMes, solicitacoesEntreguesMes, doacoesMes,
                    0, 0, 0, 0,
                    new List<SolicitacaoResumoDTO>()
                );
            }

            // --- ADMIN: tudo + últimas solicitações ---
            var statsAdmin = await EstoqueStatsAsync(hoje, limite30);

            var ultimas = await _context.Solicitacoes.AsNoTracking()
                .Include(s => s.Solicitante)
                .OrderByDescending(s => s.DataSolicitacao)
                .Take(5)
                .Select(s => new SolicitacaoResumoDTO(
                    s.Id,
                    s.Solicitante != null ? s.Solicitante.Nome : "—",
                    s.DataSolicitacao,
                    s.Status))
                .ToListAsync();

            return new DashboardResponseDTO(
                doadoresAtivos, doadoresTotal,
                solicitantesAtivos, solicitantesTotal,
                solicitacoesPendentes, solicitacoesMes, solicitacoesEntreguesMes, doacoesMes,
                statsAdmin.Kg, statsAdmin.Baixo, statsAdmin.Vencendo30, statsAdmin.Vencidos,
                ultimas
            );
        }

        private async Task<(decimal Kg, int Baixo, int Vencendo30, int Vencidos)> EstoqueStatsAsync(
            DateTime hoje, DateTime limite30)
        {
            var kg = await _context.Estoque
                .SumAsync(e => e.Quantidade * (e.Produto != null ? (e.Produto.PesoKg ?? 0m) : 0m));

            // Saldo por produto (lotes somados)
            var saldos = await _context.Estoque
                .GroupBy(e => e.ProdutoId)
                .Select(g => g.Sum(x => x.Quantidade))
                .ToListAsync();
            var baixo = saldos.Count(s => s <= 5);

            var vencendo = await _context.Estoque.CountAsync(e =>
                e.Quantidade > 0 && e.DataValidade != null &&
                e.DataValidade >= hoje && e.DataValidade < limite30);

            var vencidos = await _context.Estoque.CountAsync(e =>
                e.Quantidade > 0 && e.DataValidade != null && e.DataValidade < hoje);

            return (kg, baixo, vencendo, vencidos);
        }
    }
}
