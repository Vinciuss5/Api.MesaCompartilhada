namespace EstoqueAPI.DTOs
{
    /// <summary>
    /// DTO do painel (Dashboard). Os campos não visíveis ao perfil
    /// são enviados como 0/null — o backend já filtra por perfil.
    /// </summary>
    public record DashboardResponseDTO(
        // Cadastros
        int DoadoresAtivos,
        int DoadoresTotal,
        int SolicitantesAtivos,
        int SolicitantesTotal,

        // Movimento
        int SolicitacoesPendentes,
        int SolicitacoesMes,
        int SolicitacoesEntreguesMes,
        int DoacoesMes,

        // Estoque
        decimal EstoqueTotalKg,
        int ProdutosBaixoEstoque,
        int LotesVencendo30Dias,
        int LotesVencidos,

        // Últimas solicitações (ADMIN/CADASTRO)
        List<SolicitacaoResumoDTO> UltimasSolicitacoes
    );

    /// <summary>
    /// Resumo enxuto de solicitação para o Dashboard.
    /// </summary>
    public record SolicitacaoResumoDTO(
        int Id,
        string NomeSolicitante,
        DateTime DataSolicitacao,
        string Status
    );
}
