// src/services/documentos.js
// Utilitários compartilhados: máscaras, validação de CPF/CNPJ e busca de endereço por CEP (ViaCEP).

export const somenteDigitos = (valor) => (valor || '').replace(/\D/g, '');

export const formatarCPF = (valor) => {
  if (!valor) return '';
  return somenteDigitos(valor)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatarCNPJ = (valor) => {
  if (!valor) return '';
  return somenteDigitos(valor)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatarCEP = (valor) => {
  if (!valor) return '';
  return somenteDigitos(valor)
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const formatarTelefone = (valor) => {
  if (!valor) return '';
  return somenteDigitos(valor)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

// --- Validação dos dígitos verificadores (mesmo algoritmo do backend) ---

export function validarCPF(cpf) {
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  for (let posicao = 9; posicao < 11; posicao++) {
    let soma = 0;
    for (let i = 0; i < posicao; i++) soma += Number(digitos[i]) * (posicao + 1 - i);
    let digito = (soma * 10) % 11;
    if (digito === 10) digito = 0;
    if (digito !== Number(digitos[posicao])) return false;
  }
  return true;
}

export function validarCNPJ(cnpj) {
  const digitos = somenteDigitos(cnpj);
  if (digitos.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digitos)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  for (let posicao = 12; posicao < 14; posicao++) {
    const pesos = posicao === 12 ? pesos1 : pesos2;
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += Number(digitos[i]) * pesos[i];
    const resto = soma % 11;
    const digito = resto < 2 ? 0 : 11 - resto;
    if (digito !== Number(digitos[posicao])) return false;
  }
  return true;
}

// --- Busca de endereço pelo CEP (API pública do ViaCEP) ---
// Devolve o endereço pronto ("Rua X, Bairro, Cidade/UF") ou null se não achar.
export async function buscarEnderecoPorCep(cep) {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return null;

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    if (dados.erro) return null;

    const partes = [dados.logradouro, dados.bairro, `${dados.localidade}/${dados.uf}`]
      .filter(Boolean);
    return partes.length ? partes.join(', ') : null;
  } catch {
    return null; // sem internet ou ViaCEP fora do ar: usuário digita o endereço na mão
  }
}
