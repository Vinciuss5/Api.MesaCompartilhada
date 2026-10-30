using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstoqueAPI.Models
{
    /// <summary>
    /// Token de recuperação de senha ("esqueci minha senha").
    /// Um token de uso único, com validade curta, vinculado ao usuário.
    /// </summary>
    [Table("SenhaResetTokens")]
    public class SenhaResetToken
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(64)]
        public string Token { get; set; } = string.Empty;

        [Required]
        public int UsuarioId { get; set; }

        [Required]
        public DateTime ExpiraEm { get; set; }

        public bool Usado { get; set; } = false;

        // --- Relacionamentos (Navegação) ---
        [ForeignKey(nameof(UsuarioId))]
        public virtual Usuario Usuario { get; set; } = null!;
    }
}
