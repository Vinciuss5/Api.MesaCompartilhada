using System.ComponentModel.DataAnnotations;

namespace EstoqueAPI.Validacoes
{
    /// <summary>
    /// Valida os dígitos verificadores do CNPJ (empresas).
    /// Valor vazio/nulo passa direto; se preenchido, precisa ser um CNPJ real.
    /// </summary>
    public sealed class CnpjValidoAttribute : ValidationAttribute
    {
        protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
        {
            var cnpj = value as string;
            if (string.IsNullOrWhiteSpace(cnpj))
                return ValidationResult.Success; // CNPJ é opcional

            return DocumentosBR.ValidarCnpj(cnpj)
                ? ValidationResult.Success
                : new ValidationResult(ErrorMessage ?? "O CNPJ informado não é válido.");
        }
    }
}
