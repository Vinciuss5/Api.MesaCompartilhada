using System.ComponentModel.DataAnnotations;

namespace EstoqueAPI.DTOs
{
    /// <summary>
    /// Solicitação de recuperação de senha ("esqueci minha senha").
    /// A API sempre responde de forma genérica para não revelar
    /// se o e-mail existe ou não no sistema.
    /// </summary>
    public record EsqueciSenhaDTO(
        [Required(ErrorMessage = "O e-mail é obrigatório.")]
        [EmailAddress(ErrorMessage = "E-mail em formato inválido.")]
        string Email
    );

    /// <summary>
    /// Redefinição da senha usando o token recebido por e-mail.
    /// </summary>
    public record RedefinirSenhaDTO(
        [Required(ErrorMessage = "O token é obrigatório.")]
        string Token,

        [Required(ErrorMessage = "A nova senha é obrigatória.")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "A senha deve ter no mínimo 8 caracteres.")]
        string NovaSenha
    );
}
