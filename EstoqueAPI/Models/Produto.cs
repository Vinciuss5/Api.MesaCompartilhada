using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstoqueAPI.Models
{
    // 1. BLINDAGEM DE TABELA: Explicitando o nome da tabela no plural
    [Table("Produtos")]
    public class Produto
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "O nome do produto é obrigatório.")]
        [StringLength(80)]
        public string Nome { get; set; } = string.Empty;

        public decimal? PesoKg { get; set; }

        // --- Relacionamentos (Navegação) ---

        /// <summary>
        /// 2. MAPEAMENTO INVERSO: O atributo InverseProperty garante que o EF ligue 
        /// estas coleções às chaves estrangeiras que definimos nas outras models.
        /// </summary>

        [InverseProperty(nameof(Estoque.Produto))]
        public virtual ICollection<Estoque> Estoques { get; set; } = new List<Estoque>();

        [InverseProperty(nameof(DoacaoItem.Produto))]
        public virtual ICollection<DoacaoItem> DoacaoItens { get; set; } = new List<DoacaoItem>();

        [InverseProperty(nameof(SolicitacaoItem.Produto))]
        public virtual ICollection<SolicitacaoItem> SolicitacaoItens { get; set; } = new List<SolicitacaoItem>();
    }
}