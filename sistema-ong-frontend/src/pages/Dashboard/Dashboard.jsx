import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../hooks/useDashboard';
import { AuthContext } from '../../contexts/auth-context';

const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const formatarStatus = (s) => {
  const mapa = {
    PENDENTE: 'bg-amber-100 text-amber-800 border-amber-200',
    ENTREGUE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CANCELADO: 'bg-red-100 text-red-700 border-red-200',
  };
  return mapa[s] || 'bg-gray-100 text-gray-700 border-gray-200';
};

function Card({ titulo, valor, detalhe, tom = 'verde', onClick }) {
  const tons = {
    verde: 'text-[#007F45]',
    ambar: 'text-amber-600',
    vermelho: 'text-red-600',
    azul: 'text-blue-600',
    cinza: 'text-[#2D3748]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-left w-full transition-all ${onClick ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'}`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-[#718096]">{titulo}</p>
      <p className={`text-3xl font-black mt-2 ${tons[tom]}`}>{valor}</p>
      {detalhe && <p className="text-xs text-[#718096] mt-1">{detalhe}</p>}
    </button>
  );
}

export default function Dashboard() {
  const { tipo } = useContext(AuthContext);
  const { dashboard, loading, error, fetchDashboard } = useDashboard();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading && !dashboard) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#007F45]"></div>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 max-w-lg">
          Não foi possível carregar o painel: {error}
        </div>
      </div>
    );
  }

  const d = dashboard || {};

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2D3748] p-4 md:p-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3748]">Painel</h1>
          <p className="text-sm text-[#718096] mt-1">
            Visão geral da Mesa Compartilhada em {new Date().toLocaleDateString('pt-BR')}.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="bg-white border border-gray-200 text-[#4A5568] px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-all self-start"
        >
          Atualizar
        </button>
      </div>

      {/* --- VISÃO POR PERFIL --- */}
      {tipo === 'FUNCIONARIO' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card titulo="Estoque total" valor={`${Number(d.estoqueTotalKg ?? 0).toLocaleString('pt-BR')} kg`} tom="azul" onClick={() => navigate('/estoque')} />
            <Card titulo="Produtos com estoque baixo" valor={d.produtosBaixoEstoque ?? 0} detalhe="saldo de até 5kg/un" tom={d.produtosBaixoEstoque > 0 ? 'ambar' : 'verde'} onClick={() => navigate('/estoque')} />
            <Card titulo="Lotes vencendo (30 dias)" valor={d.lotesVencendo30Dias ?? 0} tom={d.lotesVencendo30Dias > 0 ? 'ambar' : 'verde'} onClick={() => navigate('/estoque')} />
            <Card titulo="Lotes vencidos" valor={d.lotesVencidos ?? 0} tom={d.lotesVencidos > 0 ? 'vermelho' : 'verde'} onClick={() => navigate('/estoque')} />
          </div>
          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <p className="text-sm text-[#718096]">
              Você está no perfil <b>Funcionário</b>: o painel mostra apenas dados do
              Controle de Estoque.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Cadastros e movimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card titulo="Doadores ativos" valor={`${d.doadoresAtivos ?? 0}`} detalhe={`${d.doadoresTotal ?? 0} no total`} tom="verde" onClick={() => navigate('/doador')} />
            <Card titulo="Solicitantes ativos" valor={`${d.solicitantesAtivos ?? 0}`} detalhe={`${d.solicitantesTotal ?? 0} no total`} tom="verde" onClick={() => navigate('/solicitante')} />
            <Card titulo="Solicitações pendentes" valor={d.solicitacoesPendentes ?? 0} detalhe="aguardando entrega" tom={d.solicitacoesPendentes > 0 ? 'ambar' : 'verde'} onClick={tipo === 'ADMIN' ? () => navigate('/solicitacao') : undefined} />
            <Card titulo="Doações no mês" valor={d.doacoesMes ?? 0} detalhe="entradas registradas" tom="azul" onClick={tipo === 'ADMIN' ? () => navigate('/doacao') : undefined} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
            <Card titulo="Solicitações no mês" valor={d.solicitacoesMes ?? 0} tom="cinza" />
            <Card titulo="Entregas no mês" valor={d.solicitacoesEntreguesMes ?? 0} tom="verde" />
            {tipo === 'ADMIN' && (
              <>
                <Card titulo="Lotes vencendo (30 dias)" valor={d.lotesVencendo30Dias ?? 0} tom={d.lotesVencendo30Dias > 0 ? 'ambar' : 'verde'} onClick={() => navigate('/estoque')} />
                <Card titulo="Lotes vencidos" valor={d.lotesVencidos ?? 0} tom={d.lotesVencidos > 0 ? 'vermelho' : 'verde'} onClick={() => navigate('/estoque')} />
              </>
            )}
          </div>

          {/* Últimas solicitações (ADMIN) */}
          {tipo === 'ADMIN' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-6 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-[#2D3748]">Últimas solicitações</h2>
                <button onClick={() => navigate('/solicitacao')} className="text-sm text-[#007F45] font-semibold hover:underline">
                  Ver todas
                </button>
              </div>
              {(d.ultimasSolicitacoes || []).length === 0 ? (
                <p className="p-5 text-sm text-[#718096]">Nenhuma solicitação registrada ainda.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-[#718096]">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">#</th>
                      <th className="px-5 py-3 text-left font-semibold">Solicitante</th>
                      <th className="px-5 py-3 text-left font-semibold">Data</th>
                      <th className="px-5 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(d.ultimasSolicitacoes || []).map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-bold">{s.id}</td>
                        <td className="px-5 py-3">{s.nomeSolicitante}</td>
                        <td className="px-5 py-3 text-[#718096]">{formatarData(s.dataSolicitacao)}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${formatarStatus(s.status)}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
