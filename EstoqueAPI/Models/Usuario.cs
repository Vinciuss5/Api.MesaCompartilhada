using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EstoqueAPI.Models
{
    public class Usuario
    {
        [Key]
        public int Id { get; set; }

        [Required(ErrorMessage = "O nome é obrigatório.")]
        [StringLength(80)]
        public string Nome { get; set; } = string.Empty;

        [Required(ErrorMessage = "O e-mail é obrigatório.")]
        [EmailAddress(ErrorMessage = "E-mail em formato inválido.")]
        [StringLength(120)]
        public string Email { get; set; } = string.Empty;

        // Cadastro simplificado: o CPF não é mais obrigatório para usuário do sistema
        [StringLength(11)]
        [Column(TypeName = "CHAR(11)")] // Otimização de banco: CPF sempre tem 11 caracteres
        public string? CPF { get; set; }

        [StringLength(20)]
        public string? Telefone { get; set; }

        [Required]
        public DateTime DataAdmissao { get; set; } = DateTime.UtcNow;

        [Required]
        [StringLength(255)]
        public string SenhaHash { get; set; } = string.Empty;

        [Required]
        [StringLength(15)]
        public string Tipo { get; set; } = "FUNCIONARIO"; // ADMIN, FUNCIONARIO ou CADASTRO

        public bool Ativo { get; set; } = true;

        // --- Relacionamentos (Navegação) ---

        // Um usuário pode ser autor de vários logs de sistema[cite: 7]
        public virtual ICollection<Logs> Logs { get; set; } = new List<Logs>();
    }
}