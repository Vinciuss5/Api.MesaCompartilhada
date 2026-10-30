import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha: senha }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        alert('Senha redefinida com sucesso! Já pode entrar no sistema.');
        navigate('/login');
      } else {
        setErro(data.message || 'Link inválido ou expirado. Solicite um novo.');
      }
    } catch {
      setErro('Falha de conexão com o servidor. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight text-center">
          Criar nova senha
        </h1>

        {!token ? (
          <div className="mt-6 text-center space-y-4">
            <p className="text-sm text-red-600 font-semibold">
              Link inválido: o token de recuperação está ausente.
            </p>
            <Link
              to="/esqueci-senha"
              className="inline-block w-full py-3 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 transition-all"
            >
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Nova senha
              </label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-green-600 focus:ring-2 focus:ring-green-100 outline-none transition-all text-gray-800"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirmar nova senha
              </label>
              <input
                type="password"
                placeholder="Repita a nova senha"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-green-600 focus:ring-2 focus:ring-green-100 outline-none transition-all text-gray-800"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>

            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center"
            >
              {isLoading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></span>
              ) : (
                'Salvar nova senha'
              )}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-green-700 font-semibold hover:underline">
                ← Voltar para o login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
