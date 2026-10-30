import React, { useState, useEffect, useRef } from 'react';
import { useSolicitantes } from '../../hooks/useSolicitantes';
import {
  formatarCPF,
  formatarCNPJ,
  formatarTelefone,
  formatarCEP,
  somenteDigitos,
  validarCPF,
  validarCNPJ,
  buscarEnderecoPorCep
} from '../../services/documentos';
import { exportarCSV, sufixoData } from '../../services/exportarCSV';

export default function SolicitantesIndex() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // null = cadastro | id = edição
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ativos');
  const { solicitantes, loading, fetchSolicitantes, createSolicitante, updateSolicitante, desativarSolicitante, restaurarSolicitante, primeiraExecucao } = useSolicitantes();

  // tipoPessoa: 'F' = pessoa física (CPF) | 'J' = empresa/razão social (CNPJ)
  const formInicial = { nome: '', email: '', cpf: '', cnpj: '', telefone: '', cep: '', enderecoEntrega: '' };
  const [tipoPessoa, setTipoPessoa] = useState('F');
  const [formData, setFormData] = useState(formInicial);
  const arquivoInputRef = useRef(null);

  const stripMask = (value) => (value || '').replace(/\D/g, '');

  useEffect(() => {
    if (primeiraExecucao.current) {
      primeiraExecucao.current = false;
      fetchSolicitantes(searchTerm);
      return;
    }
    const delayDebounce = setTimeout(() => {
      fetchSolicitantes(searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, fetchSolicitantes]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') formattedValue = formatarCPF(value);
    if (name === 'cnpj') formattedValue = formatarCNPJ(value);
    if (name === 'telefone') formattedValue = formatarTelefone(value);
    if (name === 'cep') formattedValue = formatarCEP(value);

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  // Busca automática do endereço de entrega pelo CEP (ViaCEP)
  const handleCepBlur = async () => {
    if (somenteDigitos(formData.cep).length !== 8) return;
    const endereco = await buscarEnderecoPorCep(formData.cep);
    if (endereco) setFormData(prev => ({ ...prev, enderecoEntrega: endereco }));
  };

  const trocarTipoPessoa = (tipo) => {
    setTipoPessoa(tipo);
    // Limpa o documento do outro tipo para não enviar os dois
    setFormData(prev => ({ ...prev, cpf: tipo === 'F' ? prev.cpf : '', cnpj: tipo === 'J' ? prev.cnpj : '' }));
  };

  // --- Abrir modal: novo cadastro ou edição ---
  const abrirNovo = () => {
    setEditandoId(null);
    setFormData(formInicial);
    setTipoPessoa('F');
    setIsModalOpen(true);
  };

  const abrirEdicao = (s) => {
    setEditandoId(s.id);
    // Detecta o tipo pelo documento existente
    setTipoPessoa(s.cnpj ? 'J' : 'F');
    setFormData({
      nome: s.nome || '',
      email: s.email || '',
      cpf: formatarCPF(s.cpf || ''),
      cnpj: formatarCNPJ(s.cnpj || ''),
      telefone: formatarTelefone(s.telefone || ''),
      cep: '',
      enderecoEntrega: s.enderecoEntrega || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Pessoa física precisa de um CPF válido; empresa, de um CNPJ válido
    if (tipoPessoa === 'F') {
      if (!formData.cpf) { alert('Informe o CPF do solicitante.'); return; }
      if (!validarCPF(formData.cpf)) { alert('O CPF informado não é válido. Verifique os dígitos.'); return; }
    } else {
      if (!formData.cnpj) { alert('Informe o CNPJ da empresa.'); return; }
      if (!validarCNPJ(formData.cnpj)) { alert('O CNPJ informado não é válido. Verifique os dígitos.'); return; }
    }

    const dataToSubmit = {
      nome: formData.nome.trim(),
      email: formData.email.trim(),
      telefone: stripMask(formData.telefone),
      enderecoEntrega: formData.enderecoEntrega.trim(),
      cpf: tipoPessoa === 'F' ? stripMask(formData.cpf) : null,
      cnpj: tipoPessoa === 'J' ? stripMask(formData.cnpj) : null
    };

    const result = editandoId
      ? await updateSolicitante(editandoId, dataToSubmit)
      : await createSolicitante(dataToSubmit);

    if (result.success) {
      setIsModalOpen(false);
      setFormData(formInicial);
      setTipoPessoa('F');
      setEditandoId(null);
      fetchSolicitantes(searchTerm);
    } else {
      alert(result.error || result.message);
    }
  };

  // --- Exclusão lógica: desativar (mantém histórico) ---
  const handleDesativar = async (s) => {
    if (!window.confirm(`Desativar o solicitante "${s.nome}"? O histórico de solicitações será mantido e você poderá reativá-lo quando quiser.`)) return;
    try {
      await desativarSolicitante(s.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestaurar = async (s) => {
    try {
      await restaurarSolicitante(s.id);
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Filtro de status aplicado no cliente ---
  const solicitantesFiltrados = solicitantes.filter((s) => {
    if (filtroStatus === 'ativos') return s.ativo;
    if (filtroStatus === 'inativos') return !s.ativo;
    return true;
  });

  // --- Exportar CSV ---
  const exportar = () => {
    exportarCSV(
      `solicitantes-${sufixoData()}.csv`,
      ['Nome', 'E-mail', 'Telefone', 'CPF', 'CNPJ', 'Endereço de Entrega', 'Status'],
      solicitantesFiltrados.map((s) => [
        s.nome,
        s.email,
        s.telefone,
        s.cpf,
        s.cnpj,
        s.enderecoEntrega,
        s.ativo ? 'Ativo' : 'Inativo',
      ])
    );
  };

  // --- Importar CSV em massa (template: nome;cpf;cnpj;telefone;email;enderecoentrega) ---
  const handleImportarArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    const texto = await arquivo.text();
    const linhas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
    if (linhas.length < 2) {
      alert('O arquivo deve ter um cabeçalho e pelo menos uma linha de dados.');
      return;
    }

    const sep = linhas[0].includes(';') ? ';' : ',';
    const cabecalho = linhas[0].split(sep).map((c) => c.trim().toLowerCase());
    const colNome = cabecalho.indexOf('nome');
    const colCpf = cabecalho.indexOf('cpf');
    const colCnpj = cabecalho.indexOf('cnpj');
    const colTel = cabecalho.indexOf('telefone');
    const colEmail = cabecalho.indexOf('email');
    const colEnd = cabecalho.indexOf('enderecoentrega') !== -1 ? cabecalho.indexOf('enderecoentrega') : cabecalho.indexOf('endereco');

    if (colNome === -1) {
      alert('Cabeçalho inválido: é obrigatória uma coluna "nome".\nTemplate: nome;cpf;cnpj;telefone;email;enderecoentrega');
      return;
    }

    const registros = linhas.slice(1).map((linha) => {
      const c = linha.split(sep).map((v) => v.trim().replace(/^"|"$/g, ''));
      return {
        nome: c[colNome] || '',
        cpf: colCpf !== -1 ? stripMask(c[colCpf] || '') : '',
        cnpj: colCnpj !== -1 ? stripMask(c[colCnpj] || '') : '',
        telefone: colTel !== -1 ? stripMask(c[colTel] || '') : '',
        email: colEmail !== -1 ? c[colEmail] || '' : '',
        enderecoEntrega: colEnd !== -1 ? c[colEnd] || '' : '',
      };
    }).filter((r) => r.nome !== '');

    if (!window.confirm(`Importar ${registros.length} solicitante(s) do arquivo "${arquivo.name}"?`)) return;

    let importados = 0;
    const erros = [];
    for (const [i, r] of registros.entries()) {
      try {
        // Um dos dois documentos é obrigatório (validado no backend também)
        if (!r.cpf && !r.cnpj) {
          erros.push(`Linha ${i + 2} (${r.nome}): informe o CPF ou o CNPJ.`);
          continue;
        }
        if (r.cpf && !validarCPF(r.cpf)) {
          erros.push(`Linha ${i + 2}: CPF inválido (${r.cpf})`);
          continue;
        }
        if (r.cnpj && !validarCNPJ(r.cnpj)) {
          erros.push(`Linha ${i + 2}: CNPJ inválido (${r.cnpj})`);
          continue;
        }
        const payload = {
          nome: r.nome,
          email: r.email,
          telefone: r.telefone,
          enderecoEntrega: r.enderecoEntrega || 'Não informado',
          cpf: r.cnpj ? null : r.cpf,
          cnpj: r.cnpj || null,
        };
        const result = await createSolicitante(payload);
        if (result.success === false) throw new Error(result.error || 'Erro ao cadastrar');
        importados++;
      } catch (err) {
        erros.push(`Linha ${i + 2} (${r.nome}): ${err.message}`);
      }
    }

    await fetchSolicitantes(searchTerm);

    const resumo = `Importação concluída: ${importados} importado(s), ${erros.length} erro(s).`;
    alert(erros.length > 0 ? `${resumo}\n\n${erros.slice(0, 10).join('\n')}${erros.length > 10 ? `\n... e mais ${erros.length - 10} erro(s).` : ''}` : resumo);
  };

  const baixarModelo = () => {
    exportarCSV('modelo-importacao-solicitantes.csv',
      ['nome', 'cpf', 'cnpj', 'telefone', 'email', 'enderecoentrega'],
      [
        ['João da Silva', '52998224725', '', '15996404717', 'joao@exemplo.com', 'Rua A, 10 - Centro, São Paulo - SP'],
        ['Instituto Ajuda Ltda', '', '11222333000181', '15996404717', 'contato@instituto.com', 'Av. B, 200 - Vila, Campinas - SP'],
      ]
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3748] p-4 md:p-8 font-sans">
      
      {/* Header Estratégico */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3748]">Solicitantes</h1>
          <p className="text-sm text-[#718096] mt-1">Gestão de beneficiários e controle de entrega de donativos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportar}
            disabled={solicitantesFiltrados.length === 0}
            className="bg-white border border-gray-200 text-[#4A5568] px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => arquivoInputRef.current?.click()}
            className="bg-white border border-gray-200 text-[#4A5568] px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-all"
          >
            Importar CSV
          </button>
          <input
            ref={arquivoInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportarArquivo}
          />
          <button
            onClick={abrirNovo}
            className="bg-[#007F45] hover:bg-[#006838] text-white px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 text-sm shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Novo Solicitante
          </button>
        </div>
      </div>

      {/* Barra de Busca + filtro de status */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-[#718096]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, CPF ou CNPJ..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#007F45] focus:border-[#007F45] transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
          {[['ativos', 'Ativos'], ['inativos', 'Inativos'], ['todos', 'Todos']].map(([valor, rotulo]) => (
            <button
              key={valor}
              onClick={() => setFiltroStatus(valor)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${filtroStatus === valor ? 'bg-white text-[#007F45] shadow-sm' : 'text-[#718096] hover:text-[#2D3748]'}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <button onClick={baixarModelo} className="text-xs text-[#007F45] font-semibold hover:underline sm:ml-auto">
          Baixar modelo de importação
        </button>
      </div>

      {/* Tabela de Dados - Layout Corrigido */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm table-fixed min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-100 text-[#718096]">
            <tr>
              <th className="px-6 py-4 font-semibold text-left w-3/12">Nome</th>
              <th className="px-6 py-4 font-semibold text-left w-2/12">E-mail</th>
              <th className="px-6 py-4 font-semibold text-left w-2/12">Telefone</th>
              <th className="px-6 py-4 font-semibold text-left w-2/12">CPF / CNPJ</th>
              <th className="px-6 py-4 font-semibold text-left w-2/12">Endereço de Entrega</th>
              <th className="px-6 py-4 font-semibold text-left w-1/12">Status</th>
              <th className="px-6 py-4 font-semibold text-right w-2/12">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[#2D3748]">
            {loading ? (
              <tr><td colSpan="7" className="text-center py-10 animate-pulse">Carregando dados...</td></tr>
            ) : solicitantesFiltrados.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-10 text-[#718096]">Nenhum solicitante encontrado.</td></tr>
            ) : solicitantesFiltrados.map((s) => (
              <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${!s.ativo ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 font-bold text-left" title={s.nome}>
                  {s.nome}  
                </td>
                <td className="px-6 py-4 text-left" title={s.email}>
                  {s.email || '-'}
                </td>
                <td className="px-6 py-4 text-left">
                  {formatarTelefone(s.telefone)}
                </td>
                <td className="px-6 py-4 text-left">
                  {/* Pessoa física mostra CPF; empresa mostra CNPJ */}
                  {s.cpf ? formatarCPF(s.cpf) : (formatarCNPJ(s.cnpj) || '-')}
                </td>
                <td className="px-6 py-4 text-left text-[#718096] whitespace-nowrap" title={s.enderecoEntrega}>
                  {s.enderecoEntrega}
                </td>
                <td className="px-6 py-4 text-left">
                  {s.ativo ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Ativo</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">Inativo</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <button
                    onClick={() => abrirEdicao(s)}
                    className="text-[#007F45] hover:underline text-sm font-semibold mr-3"
                  >
                    Editar
                  </button>
                  {s.ativo ? (
                    <button
                      onClick={() => handleDesativar(s)}
                      className="text-red-600 hover:underline text-sm font-semibold"
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRestaurar(s)}
                      className="text-blue-600 hover:underline text-sm font-semibold"
                    >
                      Reativar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A202C]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
              <h2 className="text-xl font-bold text-[#2D3748]">{editandoId ? 'Editar Solicitante' : 'Cadastrar Novo Solicitante'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#718096] hover:text-red-500 transition-colors">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-8">
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-12">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#4A5568]">Nome Completo</label>
                    <input name="nome" value={formData.nome} onChange={handleInputChange} required type="text" placeholder="Nome do beneficiário" className="w-full border border-gray-300 rounded-md py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#007F45]/20 focus:border-[#007F45] focus:outline-none transition-all" />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#4A5568]">E-mail (Opcional)</label>
                    <input name="email" value={formData.email} onChange={handleInputChange} type="email" placeholder="contato@exemplo.com" className="w-full border border-gray-300 rounded-md py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#007F45]/20 focus:border-[#007F45] focus:outline-none transition-all" />
                  </div>

                  {/* Seletor: Pessoa Física (CPF) ou Empresa (CNPJ) */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#4A5568]">Tipo de Solicitante</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => trocarTipoPessoa('F')}
                        className={`flex-1 py-2.5 px-3 rounded-md text-sm font-semibold border transition-all ${tipoPessoa === 'F' ? 'bg-[#007F45] text-white border-[#007F45]' : 'bg-white text-[#4A5568] border-gray-300 hover:border-[#007F45]'}`}>
                        Pessoa Física
                      </button>
                      <button type="button" onClick={() => trocarTipoPessoa('J')}
                        className={`flex-1 py-2.5 px-3 rounded-md text-sm font-semibold border transition-all ${tipoPessoa === 'J' ? 'bg-[#007F45] text-white border-[#007F45]' : 'bg-white text-[#4A5568] border-gray-300 hover:border-[#007F45]'}`}>
                        Empresa (CNPJ)
                      </button>
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    {tipoPessoa === 'F' ? (
                      <>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#4A5568]">CPF</label>
                        <input name="cpf" value={formData.cpf} onChange={handleInputChange} required type="text" className="w-full border border-gray-300 rounded-md py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#007F45]/20 focus:border-[#007F45] focus:outline-none transition-all" placeholder="000.000.000-00" maxLength="14" />
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#4A5568]">CNPJ</label>
                        <input name="cnpj" value={formData.cnpj} onChange={handleInputChange} required type="text" className="w-full border border-gray-300 rounded-md py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#007F45]/20 focus:border-[#007F45] focus:outline-none transition-all" placeholder="00.000.000/0000-00" maxLength="18" />
                      </>
                    )}
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#4A5568]">Telefone</label>
                    <input name="telefone" value={formData.telefone} onChange={handleInputChange} required type="text" className="w-full border border-gray-300 rounded-md py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#007F45]/20 focus:border-[#007F45] focus:outline-none transition-all" placeholder="(00) 00000-0000" maxLength="15" />
                  </div>

                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#4A5568]">CEP</label>
                    <input name="cep" value={formData.cep} onChange={handleInputChange} onBlur={handleCepBlur} type="text" className="w-full border border-gray-300 rounded-md py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#007F45]/20 focus:border-[#007F45] focus:outline-none transition-all" placeholder="00000-000" maxLength="9" />
                  </div>

                  <div className="col-span-12 md:col-span-8">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#4A5568]">Endereço Completo de Entrega</label>
                    <input name="enderecoEntrega" value={formData.enderecoEntrega} onChange={handleInputChange} required type="text" placeholder="Rua, Número - Bairro, Cidade - UF" className="w-full border border-gray-300 rounded-md py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#007F45]/20 focus:border-[#007F45] focus:outline-none transition-all" />
                    <p className="text-xs text-[#718096] mt-1">Preencha o CEP e o endereço é preenchido automaticamente (confira o número).</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-[#718096] hover:text-[#2D3748] transition-colors">Descartar</button>
                <button type="submit" className="bg-[#007F45] hover:bg-[#006838] text-white px-8 py-2.5 rounded-md font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95">
                  {editandoId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
