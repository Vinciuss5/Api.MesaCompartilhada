// src/services/exportarCSV.js
// Exporta uma tabela (headers + linhas) como arquivo CSV compatível com Excel pt-BR.

export function exportarCSV(nomeArquivo, cabecalhos, linhas) {
  const escapar = (valor) => {
    const s = valor === null || valor === undefined ? '' : String(valor);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const corpo = [
    cabecalhos.map(escapar).join(';'),
    ...linhas.map((linha) => linha.map(escapar).join(';')),
  ].join('\r\n');

  // BOM UTF-8 para o Excel reconhecer acentos
  const blob = new Blob(['\uFEFF' + corpo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Data de hoje no formato arquivo (2026-10-30)
export const sufixoData = () => new Date().toISOString().slice(0, 10);
