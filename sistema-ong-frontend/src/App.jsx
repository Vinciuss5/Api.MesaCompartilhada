import { useContext, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './contexts/AuthContext';

import Login from './pages/Login/Login';
import Sidebar from './components/Sidebar';
import Funcionarios from './pages/Funcionarios/Funcionarios';
import Estoque from './pages/Estoque/Estoque';
import Doador from './pages/Doador/Doador';
import Solicitante from './pages/Solicitante/Solicitante';
import Doacao from './pages/Doacao/Doacao';
import Solicitacao from './pages/Solicitacao/Solicitacao';
import Relatorios from './pages/Relatorios/Relatorios';

function App() {
  const { signed, loading } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!signed ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <div className="flex h-screen bg-[#F8F9FA] text-gray-900 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex flex-col flex-1 min-w-0">
            <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menu"
                className="p-2 rounded-md text-gray-700 hover:bg-gray-100 active:scale-95 transition"
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="font-bold text-[#007b3e] tracking-wide">Mesa Compartilhada</span>
              <div className="w-10" />
            </header>

            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              <Routes>
                <Route path="/estoque" element={<Estoque />} />
                <Route path="/funcionarios" element={<Funcionarios />} />
                <Route path="/doador" element={<Doador />} />
                <Route path="/solicitante" element={<Solicitante />} />
                <Route path="/doacao" element={<Doacao />} />
                <Route path="/solicitacao" element={<Solicitacao />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="*" element={<Navigate to="/estoque" />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;