import React, { useState, useEffect } from 'react';
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

export default function SolicitantesIndex() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { solicitantes, loading, fetchSolicitantes, createSolicitante, primeiraExecucao } = useSolicitantes();

  // tipoPessoa: 'F' = pessoa física (CPF) | 'J' = empresa/razão social (CNPJ)
  const formInicial = { nome: '', email: '', cpf: '', cnpj: '', telefone: '', cep: '', enderecoEntrega: '' };
  const [tipoPessoa, setTipoPessoa] = useState('F');
  const [formData, setFormData] = useState(formInicial);

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

    const result = await createSolicitante(dataToSubmit);

    if (result.success) {
      setIsModalOpen(false);
      setFormData(formInicial);
      setTipoPessoa('F');
      fetchSolicitantes();
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3748] p-4 md:p-8 font-sans">
      
      {/* Header Estratégico */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3748]">Solicitantes</h1>
          <p className="text-sm text-[#718096] mt-1">Gestão de beneficiários e controle de entrega de donativos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#007F45] hover:bg-[#006838] text-white px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 text-sm shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Novo Solicitante
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100">
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
      </div>

      {/* Tabela de Dados - Layout Corrigido */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm table-fixed min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-100 text-[#718096]">
            <tr>
              <th className="px-6 py-4 font-semibold text-left w-3/12">Nome</th>
              <th className="px-6 py-4 font-semibold text-left w-3/12">E-mail</th>
              <th className="px-6 py-4 font-semibold text-left w-2/12">Telefone</th>
              <th className="px-6 py-4 font-semibold text-left w-2/12">CPF / CNPJ</th>
              <th className="px-6 py-4 font-semibold text-left w-4/12">Endereço de Entrega</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[#2D3748]">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-10 animate-pulse">Carregando dados...</td></tr>
            ) : solicitantes.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1A202C]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
              <h2 className="text-xl font-bold text-[#2D3748]">Cadastrar Novo Solicitante</h2>
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
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
