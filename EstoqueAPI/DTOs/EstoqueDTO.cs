namespace EstoqueAPI.DTOs
{
    /// <summary>
    /// DTO de Resposta Completa: Utilizado em listagens e detalhes de estoque.
    /// </summary>
    public record EstoqueResponseDTO(
        int Id,
        int ProdutoId,
        string ProdutoNome,
        decimal Quantidade, // CORREÇÃO: Alterado de int para decimal
        string Status,
        decimal Peso,       // Mantido como decimal para precisão de KG
        string Origem,
        DateTime? Validade,
        string? LoteCodigo,
        DateTime DataEntrada
    );

    /// <summary>
    /// DTO Simplificado: Utilizado para consultas rápidas ou componentes leves de UI.
    /// </summary>
    public record EstoqueSimplesDTO(
        int ProdutoId,
        decimal Quantidade // CORREÇÃO: Alterado de int para decimal
    );
}