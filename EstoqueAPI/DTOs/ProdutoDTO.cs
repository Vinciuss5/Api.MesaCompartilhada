using System.ComponentModel.DataAnnotations;

namespace EstoqueAPI.DTOs
{
    // DTO para Criação: O que recebemos do formulário/cliente
    public record ProdutoCreateDTO(
        [Required(ErrorMessage = "O nome do produto é obrigatório.")]
        [StringLength(80, ErrorMessage = "O nome não pode exceder 80 caracteres.")]
        string Nome,

        [Range(0, 9999.99, ErrorMessage = "O peso deve ser um valor positivo.")]
        decimal? PesoKg
    );

    // DTO para Resposta: O que devolvemos para o cliente (inclui o ID)
    public record ProdutoResponseDTO(
        int Id,
        string Nome,
        decimal? PesoKg
    );

    // DTO para Atualização: Útil para manter a semântica de alteração
    public record ProdutoUpdateDTO(
        [Required(ErrorMessage = "O nome do produto é obrigatório.")]
        [StringLength(80)]
        string Nome,

        decimal? PesoKg
    );
}