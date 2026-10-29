using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstoqueAPI.Models
{
    [Table("Solicitacoes")] // Boa prática: Garante o nome da tabela no plural para evitar confusão do EF
    public class Solicitacao
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "O solicitante é obrigatório.")]
        public int SolicitanteId { get; set; }

        [Required]
        // Mantido o nome sugerido para refletir o momento da criação
        public DateTime DataSolicitacao { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(20)]
        // Status: PENDENTE, ENTREGUE, CANCELADO
        public string Status { get; set; } = "PENDENTE";

        [StringLength(255)]
        public string? Observacao { get; set; }

        // --- Relacionamentos (Navegação) ---

        // CORREÇÃO CRÍTICA: O nameof garante que o EF ligue esta propriedade ao SolicitanteId acima.
        // O uso do '?' permite que o objeto seja nulo se não usarmos .Include(), evitando erros de mapeamento.
        [ForeignKey(nameof(SolicitanteId))]
        public virtual Solicitante? Solicitante { get; set; } = null!;

        // Mantido para carregar os itens desta solicitação
        public virtual ICollection<SolicitacaoItem> Itens { get; set; } = new List<SolicitacaoItem>();
    }
}