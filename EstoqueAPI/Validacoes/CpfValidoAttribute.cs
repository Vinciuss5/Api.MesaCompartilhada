using System.ComponentModel.DataAnnotations;

namespace EstoqueAPI.Validacoes
{
    /// <summary>
    /// Valida os dígitos verificadores do CPF. Campo opcional:
    /// valor vazio/nulo passa direto; se preenchido, precisa ser um CPF real.
    /// </summary>
    public sealed class CpfValidoAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            var cpf = value as string;
            if (string.IsNullOrWhiteSpace(cpf))
                return ValidationResult.Success; // CPF é opcional em alguns cadastros

            return DocumentosBR.ValidarCpf(cpf)
                ? ValidationResult.Success
                : new ValidationResult(ErrorMessage ?? "O CPF informado não é válido.");
        }
    }
}
