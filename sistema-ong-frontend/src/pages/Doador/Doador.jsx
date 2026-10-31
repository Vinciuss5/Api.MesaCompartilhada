import { useState, useEffect, useRef } from 'react';
import { useDoadores } from '../../hooks/useDoadores';
import {
  formatarCPF,
  formatarTelefone,
  formatarCEP,
  somenteDigitos,
  validarCPF,
  buscarEnderecoPorCep
} from '../../services/documentos';
import { exportarCSV, sufixoData } from '../../services/exportarCSV';

const formInicial = { nome: '', email: '', cpf: '', telefone: '', cep: '', endereco: '' };

export default function DoadoresIndex() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // null = cadastro | id = edição
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ativos'); // 'ativos' | 'todos' | 'inativos'
  const { doadores, loading, fetchDoadores, createDoador, updateDoador, desativarDoador, restaurarDoador, primeiraExecucaoRef } = useDoadores();

  const [formData, setFormData] = useState(formInicial);
  const arquivoInputRef = useRef(null);

  // --- Função para limpar máscara (Sanitização para o Banco) ---
  const stripMask = (value) => (value || '').replace(/\D/g, '');

  useEffect(() => {
    if (primeiraExecucaoRef.current) {
      primeiraExecucaoRef.current = false;
      fetchDoadores(searchTerm); // busca imediata ao entrar na tela, sem esperar 500ms
      return;
    }
    const delayDebounce = setTimeout(() => {
      fetchDoadores(searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, fetchDoadores]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') formattedValue = formatarCPF(value);
    if (name === 'telefone') formattedValue = formatarTelefone(value);
    if (name === 'cep') formattedValue = formatarCEP(value);

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  // Busca automática do endereço pelo CEP (ViaCEP) ao sair do campo
  const handleCepBlur = async () => {
    if (somenteDigitos(formData.cep).length !== 8) return;
    const endereco = await buscarEnderecoPorCep(formData.cep);
    if (endereco) setFormData(prev => ({ ...prev, endereco }));
  };

  // --- Abrir modal: novo cadastro ou edição ---
  const abrirNovo = () => {
    setEditandoId(null);
    setFormData(formInicial);
    setIsModalOpen(true);
  };

  const abrirEdicao = (doador) => {
    setEditandoId(doador.id);
    setFormData({
      nome: doador.nome || '',
      email: doador.email || '',
      cpf: formatarCPF(doador.cpf || ''),
      telefone: formatarTelefone(doador.telefone || ''),
      cep: '',
      endereco: doador.endereco || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação dos dígitos verificadores do CPF antes de enviar
    if (formData.cpf && !validarCPF(formData.cpf)) {
      alert('O CPF informado não é válido. Verifique os dígitos.');
      return;
    }

    // Engenharia de Software: Criamos um DTO de envio limpo
    // Não alteramos o estado do formulário para não "pular" a máscara na tela do usuário
    const dataToSubmit = {
      nome: formData.nome.trim(),
      email: formData.email.trim(),
      cpf: stripMask(formData.cpf),
      telefone: stripMask(formData.telefone),
      endereco: formData.endereco.trim()
    };

    try {
      if (editandoId) {
        await updateDoador(editandoId, dataToSubmit); // PUT /doador/{id}
      } else {
        await createDoador(dataToSubmit); // POST /doador
      }
      setIsModalOpen(false);
      setFormData(formInicial);
      setEditandoId(null);
      fetchDoadores(searchTerm);
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Exclusão lógica: desativar (mantém histórico) ---
  const handleDesativar = async (doador) => {
    if (!window.confirm(`Desativar o doador "${doador.nome}"? O histórico de doações será mantido e você poderá reativá-lo quando quiser.`)) return;
    try {
      await desativarDoador(doador.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestaurar = async (doador) => {
    try {
      await restaurarDoador(doador.id);
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Filtro de status aplicado no cliente ---
  const doadoresFiltrados = doadores.filter((d) => {
    if (filtroStatus === 'ativos') return d.ativo;
    if (filtroStatus === 'inativos') return !d.ativo;
    return true;
  });

  // --- Exportar CSV ---
  const exportar = () => {
    exportarCSV(
      `doadores-${sufixoData()}.csv`,
      ['Nome', 'E-mail', 'Telefone', 'CPF', 'Endereço', 'Status'],
      doadoresFiltrados.map((d) => [
        d.nome,
        d.email,
        d.telefone,
        d.cpf,
        d.endereco,
        d.ativo ? 'Ativo' : 'Inativo',
      ])
    );
  };

  // --- Importar CSV em massa (template: nome;email;cpf;telefone;endereco) ---
  const handleImportarArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo
    if (!arquivo) return;

    const texto = await arquivo.text();
    const linhas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
    if (linhas.length < 2) {
      alert('O arquivo deve ter um cabeçalho e pelo menos uma linha de dados.');
      return;
    }

    // Detecta o separador (; preferencial, pois é o do template/export)
    const sep = linhas[0].includes(';') ? ';' : ',';
    const cabecalho = linhas[0].split(sep).map((c) => c.trim().toLowerCase());
    const colNome = cabecalho.indexOf('nome');
    const colEmail = cabecalho.indexOf('email');
    const colCpf = cabecalho.indexOf('cpf');
    const colTel = cabecalho.indexOf('telefone');
    const colEnd = cabecalho.indexOf('endereco');

    if (colNome === -1) {
      alert('Cabeçalho inválido: é obrigatória uma coluna "nome".\nTemplate: nome;email;cpf;telefone;endereco');
      return;
    }

    const registros = linhas.slice(1).map((linha) => {
      const c = linha.split(sep).map((v) => v.trim().replace(/^"|"$/g, ''));
      return {
        nome: c[colNome] || '',
        email: c[colEmail] || '',
        cpf: stripMask(c[colCpf] || ''),
        telefone: stripMask(c[colTel] || ''),
        endereco: c[colEnd] || '',
      };
    }).filter((r) => r.nome !== '');

    if (!window.confirm(`Importar ${registros.length} doador(es) do arquivo "${arquivo.name}"?`)) return;

    let importados = 0;
    const erros = [];
    for (const [i, registro] of registros.entries()) {
      try {
        if (registro.cpf && !validarCPF(registro.cpf)) {
          erros.push(`Linha ${i + 2}: CPF inválido (${registro.cpf})`);
          continue;
        }
        await createDoador(registro);
        importados++;
      } catch (err) {
        erros.push(`Linha ${i + 2} (${registro.nome}): ${err.message}`);
      }
    }

    await fetchDoadores(searchTerm);

    const resumo = `Importação concluída: ${importados} importado(s), ${erros.length} erro(s).`;
    alert(erros.length > 0 ? `${resumo}\n\n${erros.slice(0, 10).join('\n')}${erros.length > 10 ? `\n... e mais ${erros.length - 10} erro(s).` : ''}` : resumo);
  };

  const baixarModelo = () => {
    exportarCSV('modelo-importacao-doadores.csv',
      ['nome', 'email', 'cpf', 'telefone', 'endereco'],
      [['Maria da Silva', 'maria@exemplo.com', '52998224725', '15996404717', 'Rua das Flores, 100 - Centro, São Paulo - SP']]
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3748] p-4 md:p-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3748]">Doadores</h1>
          <p className="text-sm text-[#718096] mt-1">Gestão da rede de parceiros e doadores da instituição.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportar}
            disabled={doadoresFiltrados.length === 0}
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
            className="bg-[#007F45] hover:bg-[#006838] text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Cadastrar Doador
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-[#718096]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, CPF ou e-mail..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#007F45] focus:border-[#007F45]"
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

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-gray-50 border-b border-gray-100 text-[#718096]">
            <tr>
              <th className="px-6 py-4 font-medium text-left">Nome</th>
              <th className="px-6 py-4 font-medium text-left">E-mail</th>
              <th className="px-6 py-4 font-medium text-left">Telefone</th>
              <th className="px-6 py-4 font-medium text-left">CPF</th>
              <th className="px-6 py-4 font-medium text-left">Endereço</th>
              <th className="px-6 py-4 font-medium text-left">Status</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[#2D3748]">
            {loading ? (
                <tr><td colSpan="7" className="text-center py-10">Carregando doadores...</td></tr>
            ) : doadoresFiltrados.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-[#718096]">Nenhum doador encontrado.</td></tr>
            ) : doadoresFiltrados.map((doador) => (
              <tr key={doador.id} className={`hover:bg-gray-50 transition-colors ${!doador.ativo ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4 font-bold text-left">{doador.nome}</td>
                <td className="px-6 py-4 text-left">{doador.email}</td>
                {/* Visualização Formatada para o Usuário */}
                <td className="px-6 py-4 text-left">{formatarTelefone(doador.telefone)}</td>
                <td className="px-6 py-4 text-left">{formatarCPF(doador.cpf)}</td>
                <td className="px-6 py-4 text-left text-[#718096] whitespace-nowrap">
                  {doador.endereco}
                </td>
                <td className="px-6 py-4 text-left">
                  {doador.ativo ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Ativo</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">Inativo</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <button
                    onClick={() => abrirEdicao(doador)}
                    className="text-[#007F45] hover:underline text-sm font-semibold mr-3"
                  >
                    Editar
                  </button>
                  {doador.ativo ? (
                    <button
                      onClick={() => handleDesativar(doador)}
                      className="text-red-600 hover:underline text-sm font-semibold"
                    >
                      Desativar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRestaurar(doador)}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[650px] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">{editandoId ? 'Editar Doador' : 'Cadastrar Doador'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#718096] hover:text-[#2D3748]">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="p-6">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12">
                      <label className="block text-sm font-medium mb-1 text-[#4A5568]">Nome Completo</label>
                      <input name="nome" value={formData.nome} onChange={handleInputChange} required type="text" placeholder="Insira o nome completo" className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-[#007F45] focus:outline-none" />
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <label className="block text-sm font-medium mb-1 text-[#4A5568]">E-mail</label>
                      <input name="email" value={formData.email} onChange={handleInputChange} required type="email" placeholder="Ex: doador@exemplo.com" className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-[#007F45] focus:outline-none" />
                    </div>
                     
                    <div className="col-span-12 md:col-span-6">
                      <label className="block text-sm font-medium mb-1 text-[#4A5568]">CPF</label>
                      <input name="cpf" value={formData.cpf} onChange={handleInputChange} required type="text" className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-[#007F45] focus:outline-none" placeholder="000.000.000-00" maxLength="14" />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <label className="block text-sm font-medium mb-1 text-[#4A5568]">Telefone</label>
                      <input name="telefone" value={formData.telefone} onChange={handleInputChange} required type="text" className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-[#007F45] focus:outline-none" placeholder="(00) 00000-0000" maxLength="15" />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <label className="block text-sm font-medium mb-1 text-[#4A5568]">CEP</label>
                      <input name="cep" value={formData.cep} onChange={handleInputChange} onBlur={handleCepBlur} type="text" className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-[#007F45] focus:outline-none" placeholder="00000-000" maxLength="9" />
                    </div>

                    <div className="col-span-12 md:col-span-8">
                      <label className="block text-sm font-medium mb-1 text-[#4A5568]">Endereço Completo</label>
                      <input name="endereco" value={formData.endereco} onChange={handleInputChange} required type="text" placeholder="Rua, Número - Bairro, Cidade - UF" className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-[#007F45] focus:outline-none" />
                      <p className="text-xs text-[#718096] mt-1">Preencha o CEP e o endereço é preenchido automaticamente (confira o número).</p>
                    </div>
                </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-[#718096] text-sm font-medium hover:text-[#2D3748]">Cancelar</button>
                <button type="submit" className="bg-[#007F45] hover:bg-[#006838] text-white px-6 py-2 rounded-md font-medium text-sm shadow-sm transition-all">
                    {editandoId ? 'Salvar Alterações' : 'Salvar Doador'}
                </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );    
}
