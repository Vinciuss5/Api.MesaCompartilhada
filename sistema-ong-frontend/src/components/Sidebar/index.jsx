import { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, HeartHandshake, ClipboardList, Package, 
  ArrowDownToLine, ArrowUpFromLine, FileText, LogOut, X,
  LayoutDashboard, ScrollText 
} from 'lucide-react';

import { AuthContext } from '../../contexts/AuthContext';
import { authHeaders } from '../../services/authHeaders';

export default function Sidebar({ isOpen = false, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, tipo } = useContext(AuthContext);

  // --- Controle de acesso: menu filtrado pelo perfil do usuário ---
  const permissoes = {
    ADMIN: ['dashboard', 'funcionarios', 'doador', 'solicitante', 'estoque', 'doacao', 'solicitacao', 'relatorios', 'logs'],
    FUNCIONARIO: ['dashboard', 'estoque'],
    CADASTRO: ['dashboard', 'doador', 'solicitante'],
  };
  const permitidos = permissoes[tipo] || [];

  // Badge de solicitações pendentes (exibido no item "Saída de Solicitações")
  const [pendentes, setPendentes] = useState(0);
  useEffect(() => {
    if (tipo !== 'ADMIN') return;
    let vivo = true;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';
    fetch(`${API_URL}/dashboard`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d) setPendentes(d.solicitacoesPendentes || 0); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [tipo, location.pathname]);

  const todosItens = [
    { key: 'dashboard', name: 'Painel', icon: LayoutDashboard, path: '/dashboard' },
    { type: 'divider' },
    { key: 'funcionarios', name: 'Funcionários', icon: Users, path: '/funcionarios' },
    { key: 'doador', name: 'Doadores', icon: HeartHandshake, path: '/doador' },
    { key: 'solicitante', name: 'Solicitantes', icon: ClipboardList, path: '/solicitante' },
    { type: 'divider' },
    { key: 'estoque', name: 'Controle de Estoque', icon: Package, path: '/estoque' },
    { type: 'divider' },
    { key: 'doacao', name: 'Entrada de Doações', icon: ArrowDownToLine, path: '/doacao' },
    { key: 'solicitacao', name: 'Saída de Solicitações', icon: ArrowUpFromLine, path: '/solicitacao' },
    { key: 'relatorios', name: 'Relatórios', icon: FileText, path: '/relatorios' },
    { type: 'divider' },
    { key: 'logs', name: 'Auditoria', icon: ScrollText, path: '/logs' },
  ];

  // Mantém só as telas do perfil e remove divisórias órfãs (início/fim/duplas)
  const menuItems = todosItens
    .filter((item) => item.type === 'divider' || permitidos.includes(item.key))
    .filter((item, index, arr) => {
      if (item.type !== 'divider') return true;
      const anterior = arr[index - 1];
      const proximo = arr[index + 1];
      return anterior && proximo && anterior.type !== 'divider' && proximo.type !== 'divider';
    });

  const handleNavigate = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleLogout = () => {
    signOut();
    if (onClose) onClose();
  };

  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 min-h-screen bg-[#007b3e] flex flex-col justify-between py-6 transform transition-transform duration-200 ease-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabeçalho */}
        <div className="px-6 mb-8 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-white italic leading-tight tracking-wider uppercase">
              Mesa<br />Compartilhada
            </h1>
            <div className="w-10 h-1 bg-white/30 mt-4 rounded-full"></div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md text-white/80 hover:bg-white/10"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <div className="flex-1 px-4 overflow-y-auto">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-4 px-2">
            Principal
          </p>

          <nav className="space-y-2">
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return <div key={index} className="h-px bg-white/10 my-4 mx-2"></div>;
              }

              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
                    isActive
                      ? 'bg-white text-[#007b3e] shadow-md shadow-black/10'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-[#007b3e]' : 'text-white/70'} />
                  {item.name}
                  {/* Badge: solicitações aguardando entrega */}
                  {item.key === 'solicitacao' && pendentes > 0 && (
                    <span className="ml-auto min-w-[22px] px-1.5 py-0.5 text-center text-[11px] font-bold rounded-full bg-amber-400 text-[#4A2F00] shadow-sm">
                      {pendentes}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sair */}
        <div className="px-4 mt-8">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-4 px-2">
            Conta
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm text-white/80 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={20} className="text-white/70" />
            Sair do Sistema
          </button>
        </div>
      </div>
    </>
  );
}