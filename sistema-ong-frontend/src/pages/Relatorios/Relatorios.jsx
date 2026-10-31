// Ajuste o caminho do import conforme a estrutura de pastas do seu projeto
import { useRelatorios } from '../../hooks/useRelatorios'; 
import { exportarCSV, sufixoData } from '../../services/exportarCSV';

export default function RelatoriosDashboard() {
  const { 
    kpis, 
    alertasValidade, 
    ultimasSolicitacoes, 
    isLoading, 
    periodo, 
    setPeriodo 
  } = useRelatorios();

  // Exporta o resumo do período + alertas + últimas solicitações em um único CSV
  const exportar = () => {
    const nomePeriodo = { MES_ATUAL: 'mes-atual', ULTIMOS_30: 'ultimos-30-dias', ANO: 'ano-completo' }[periodo] || periodo;
    const linhas = [
      ['RELATÓRIO — Mesa Compartilhada'],
      ['Período', { MES_ATUAL: 'Este mês', ULTIMOS_30: 'Últimos 30 dias', ANO: 'Ano completo' }[periodo] || periodo],
      [],
      ['Indicador', 'Valor'],
      ['Solicitações pendentes', kpis.solicitacoesPendentes],
      ['Lotes vencendo em até 3 meses', kpis.produtosProximosVencimento],
      ['Doações no período', kpis.doacoesMes],
      ['Estoque total (kg/L)', kpis.estoqueTotalKg],
      [],
      ['LOTES PRÓXIMOS DO VENCIMENTO'],
      ['Produto', 'Lote', 'Validade', 'Quantidade'],
      ...alertasValidade.map((a) => [a.produto, a.lote, a.validade, a.quantidade]),
      [],
      ['ÚLTIMAS SOLICITAÇÕES'],
      ['ID', 'Solicitante', 'Data', 'Status'],
      ...ultimasSolicitacoes.map((s) => [s.id, s.solicitante, s.data, s.status]),
    ];
    // exportarCSV espera cabeçalho + linhas; aqui passamos tudo como linhas (sem cabeçalho fixo)
    exportarCSV(`relatorio-${nomePeriodo}-${sufixoData()}.csv`, linhas[0], linhas.slice(1));
  };

  // Tela de carregamento enquanto busca os dados de todos os endpoints
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#718096] font-medium">Analisando dados do sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3748] p-4 md:p-8 font-sans">
      
      {/* HEADER E CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3748]">Relatórios e Visão Geral</h1>
          <p className="text-sm text-[#718096] mt-1">Acompanhe a saúde do estoque e o fluxo de doações.</p>
        </div>
        
        {/* Filtro de Período Conectado ao Hook + exportação */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportar}
            className="bg-white border border-gray-200 text-[#4A5568] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Exportar CSV
          </button>
          <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => setPeriodo('MES_ATUAL')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${periodo === 'MES_ATUAL' ? 'bg-[#EDF2F7] text-[#2D3748]' : 'text-[#718096] hover:text-[#2D3748]'}`}
            >
              Este Mês
            </button>
            <button 
              onClick={() => setPeriodo('ULTIMOS_30')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${periodo === 'ULTIMOS_30' ? 'bg-[#EDF2F7] text-[#2D3748]' : 'text-[#718096] hover:text-[#2D3748]'}`}
            >
              Últimos 30 dias
            </button>
            <button 
              onClick={() => setPeriodo('ANO')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${periodo === 'ANO' ? 'bg-[#EDF2F7] text-[#2D3748]' : 'text-[#718096] hover:text-[#2D3748]'}`}
            >
              Ano Completo
            </button>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Solicitações Pendentes */}
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm border-l-4 border-l-amber-500 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#718096] uppercase tracking-wider">Aguardando Saída</p>
              <h2 className="text-3xl font-bold text-amber-600 mt-2">{kpis.solicitacoesPendentes}</h2>
              <p className="text-sm text-amber-700 mt-1 font-medium">Solicitações Pendentes</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-500">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>
        </div>

        {/* Card 2: Risco de Validade */}
        <div className="bg-white p-5 rounded-xl border border-red-200 shadow-sm border-l-4 border-l-red-500 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#718096] uppercase tracking-wider">Atenção Crítica</p>
              <h2 className="text-3xl font-bold text-red-600 mt-2">{kpis.produtosProximosVencimento}</h2>
              <p className="text-sm text-red-700 mt-1 font-medium">Lotes vencendo em até 3 meses</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-500">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
          </div>
        </div>

        {/* Card 3: Doações (Responsivo ao Filtro) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#718096] uppercase tracking-wider">Volume de Entrada</p>
              <h2 className="text-3xl font-bold text-[#2D3748] mt-2">{kpis.doacoesMes}</h2>
              <p className="text-sm text-[#718096] mt-1">Doações no período</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-[#007F45]">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            </div>
          </div>
        </div>

        {/* Card 4: Estoque Total */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-[#718096] uppercase tracking-wider">Estoque Atual</p>
              <h2 className="text-3xl font-bold text-[#2D3748] mt-2">{kpis.estoqueTotalKg}</h2>
              <p className="text-sm text-[#718096] mt-1">Kg / Litros totais</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            </div>
          </div>
        </div>

      </div>

      {/* ÁREA DE LISTAS ACIONÁVEIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LISTA 1: ESTOQUE VENCENDO */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-red-50/30">
            <h3 className="font-bold text-[#2D3748] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Lotes Próximos do Vencimento
            </h3>
            {/* Opcional: Aqui você pode colocar um Link do react-router-dom para a tela de Estoque */}
            {/* <button className="text-sm text-[#007F45] font-medium hover:underline">Ver Relatório Completo</button> */}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-gray-50 text-[#718096] text-xs uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium">Origem</th>
                  <th className="px-5 py-3 font-medium">Validade</th>
                  <th className="px-5 py-3 font-medium text-right">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alertasValidade.length > 0 ? (
                  alertasValidade.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-[#2D3748]">{item.produto}</td>
                      <td className="px-5 py-3 text-[#718096] font-mono text-xs">{item.lote}</td>
                      <td className="px-5 py-3 font-semibold text-red-600">{item.validade}</td>
                      <td className="px-5 py-3 text-right font-mono">{item.quantidade}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-5 py-8 text-center text-[#718096]">
                      Nenhum produto próximo do vencimento (3 meses).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LISTA 2: SOLICITAÇÕES RECENTES */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-[#2D3748]">Últimas Solicitações</h3>
            {/* Opcional: Aqui você pode colocar um Link do react-router-dom para a tela de Saídas */}
            {/* <button className="text-sm text-[#007F45] font-medium hover:underline">Ir para Saídas</button> */}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-gray-50 text-[#718096] text-xs uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Solicitante</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ultimasSolicitacoes.length > 0 ? (
                  ultimasSolicitacoes.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono text-xs text-[#718096]">{item.id}</td>
                      <td className="px-5 py-3 font-medium text-[#2D3748]">{item.solicitante}</td>
                      <td className="px-5 py-3 text-[#718096]">{item.data}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                          item.status === 'PENDENTE' ? 'bg-amber-100 text-amber-800' : 
                          item.status === 'CANCELADO' ? 'bg-red-100 text-red-800' : 
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-5 py-8 text-center text-[#718096]">
                      Nenhuma solicitação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}