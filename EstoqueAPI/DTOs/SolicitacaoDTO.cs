using System.ComponentModel.DataAnnotations;

namespace EstoqueAPI.DTOs
{
    /// <summary>
    /// DTO para Criação: O que o Frontend envia (POST).
    /// </summary>
    public record SolicitacaoCreateDTO(
        [Required(ErrorMessage = "O solicitante é obrigatório.")]
        int SolicitanteId,

        [MinLength(1, ErrorMessage = "A solicitação deve ter pelo menos um item.")]
        List<SolicitacaoItemCreateDTO> Itens,

        [StringLength(255)]
        string? Observacao
    );

    /// <summary>
    /// Item da solicitação na criação.
    /// Alterado Quantidade para 'decimal' para suportar Kg/Litros.
    /// </summary>
    public record SolicitacaoItemCreateDTO(
        [Required]
        int ProdutoId,

        [Required]
        [Range(0.01, 999999.99, ErrorMessage = "A quantidade deve ser maior que zero.")]
        decimal Quantidade
    );

    /// <summary>
    /// DTO para Resposta: O que o Frontend consome (GET).
    /// </summary>
    public record SolicitacaoResponseDTO(
        int Id,
        int SolicitanteId,
        string NomeSolicitante,
        DateTime DataSolicitacao,
        string Status,
        string? Observacao,
        List<SolicitacaoItemResponseDTO> Itens
    );

    /// <summary>
    /// Item da solicitação no retorno.
    /// </summary>
    public record SolicitacaoItemResponseDTO(
        int Id,
        int ProdutoId,
        string NomeProduto,
        decimal Quantidade // Alinhado com a precisão do estoque e da criação
    );

    /// <summary>
    /// DTO para Atualização de Status: Simples e direto.
    /// </summary>
    public record SolicitacaoStatusUpdateDTO(
        [Required]
        [RegularExpression("^(PENDENTE|ENTREGUE|CANCELADO)$", ErrorMessage = "Status inválido.")]
        string NovoStatus
    );
}