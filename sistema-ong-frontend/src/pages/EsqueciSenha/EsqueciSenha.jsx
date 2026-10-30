import { useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/esqueci-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // A API responde 200 sempre (não revela se o e-mail existe)
      if (response.ok) setEnviado(true);
      else alert('Não foi possível processar a solicitação. Tente novamente.');
    } catch {
      alert('Falha de conexão com o servidor. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6] p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight text-center">
          Recuperar senha
        </h1>

        {enviado ? (
          <div className="mt-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
              ✉️
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Se o e-mail informado estiver cadastrado, enviaremos as instruções de
              redefinição de senha. Verifique sua caixa de entrada (e a pasta de spam).
            </p>
            <Link
              to="/login"
              className="inline-block w-full py-3 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 transition-all"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <p className="text-sm text-gray-500 text-center">
              Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
            </p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                E-mail corporativo
              </label>
              <input
                type="email"
                placeholder="nome@ong.org"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-green-600 focus:ring-2 focus:ring-green-100 outline-none transition-all text-gray-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 shadow-md transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center"
            >
              {isLoading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></span>
              ) : (
                'Enviar link de recuperação'
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
