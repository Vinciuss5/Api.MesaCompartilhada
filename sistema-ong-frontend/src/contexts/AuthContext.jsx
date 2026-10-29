import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Assim que o app inicia, verificamos se já existe um token salvo
  useEffect(() => {
    const token = localStorage.getItem('@MesaCompartilhada:token');
    const tipo = localStorage.getItem('@MesaCompartilhada:tipo');
    if (token && tipo) {
      setUser({ token, tipo });
    } else if (token) {
      // Sessão antiga (anterior ao controle de acesso): força um novo login
      // para que o tipo do usuário seja definido.
      localStorage.removeItem('@MesaCompartilhada:token');
    }
    setLoading(false);
  }, []);

  async function signIn(email, senha) {
    try {
      // Fazemos a requisição para o endpoint do AuthController[cite: 2]
      // Em produção a URL vem de VITE_API_URL (relativa: /api); em dev, localhost.
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // O corpo da requisição mapeia perfeitamente para o LoginDTO[cite: 3]
        body: JSON.stringify({ email, senha }), 
      });

      const data = await response.json();

      // Tratamento de erro retornado pela API (Ex: 401 Unauthorized)[cite: 2]
      if (!response.ok) {
        return { success: false, message: data.message || 'Erro ao autenticar. Verifique suas credenciais.' };
      }

      // Sucesso: Salvamos token + tipo (as permissões) no LocalStorage
      localStorage.setItem('@MesaCompartilhada:token', data.token);
      localStorage.setItem('@MesaCompartilhada:tipo', data.tipo);
      setUser({ token: data.token, tipo: data.tipo });

      return { success: true };
    } catch (error) {
      console.error("Erro no login:", error);
      return { success: false, message: 'Erro de conexão com o servidor. Verifique se a API está rodando.' };
    }
  }

  // Função para fazer logout e limpar a sessão
  function signOut() {
    localStorage.removeItem('@MesaCompartilhada:token');
    localStorage.removeItem('@MesaCompartilhada:tipo');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ signed: !!user, user, loading, signIn, signOut, tipo: user?.tipo ?? null }}>
      {children}
    </AuthContext.Provider>
  );
}