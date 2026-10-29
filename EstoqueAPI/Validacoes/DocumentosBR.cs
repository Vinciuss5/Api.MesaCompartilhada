namespace EstoqueAPI.Validacoes
{
    /// <summary>
    /// Validação oficial dos dígitos verificadores de CPF e CNPJ.
    /// </summary>
    public static class DocumentosBR
    {
        public static bool ValidarCpf(string? cpf)
        {
            var digitos = ApenasDigitos(cpf);
            if (digitos.Length != 11) return false;
            if (digitos.All(c => c == digitos[0])) return false; // 000.../111... são inválidos

            for (var posicao = 9; posicao < 11; posicao++)
            {
                var soma = 0;
                for (var i = 0; i < posicao; i++)
                    soma += (digitos[i] - '0') * (posicao + 1 - i);

                var digito = (soma * 10) % 11;
                if (digito == 10) digito = 0;
                if (digito != (digitos[posicao] - '0')) return false;
            }
            return true;
        }

        public static bool ValidarCnpj(string? cnpj)
        {
            var digitos = ApenasDigitos(cnpj);
            if (digitos.Length != 14) return false;
            if (digitos.All(c => c == digitos[0])) return false;

            int[] pesos1 = { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
            int[] pesos2 = { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };

            for (var posicao = 12; posicao < 14; posicao++)
            {
                var pesos = posicao == 12 ? pesos1 : pesos2;
                var soma = 0;
                for (var i = 0; i < pesos.Length; i++)
                    soma += (digitos[i] - '0') * pesos[i];

                var resto = soma % 11;
                var digito = resto < 2 ? 0 : 11 - resto;
                if (digito != (digitos[posicao] - '0')) return false;
            }
            return true;
        }

        private static string ApenasDigitos(string? valor) =>
            string.IsNullOrEmpty(valor) ? string.Empty : new string(valor.Where(char.IsDigit).ToArray());
    }
}
