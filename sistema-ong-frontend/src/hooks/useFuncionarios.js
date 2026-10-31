import { useState, useCallback } from 'react';
import { authHeaders } from '../services/authHeaders';

// Centralize variáveis de ambiente. Interfaces reais não usam localhost hardcoded em produção.
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/usuario` 
  : 'http://localhost:5235/api/usuario'; 

export function useFuncionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = () => authHeaders();

  const handleResponse = async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      const serverMessage = errorData.message || 
                            (errorData.errors ? Object.values(errorData.errors).flat().join(", ") : null);
      
      throw new Error(serverMessage || 'Erro de comunicação com o servidor.');
    }
    return response.status === 204 ? null : response.json();
  };

  // 1. Listar (GET)
  const fetchFuncionarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE_URL, { headers: getHeaders() });
      const data = await handleResponse(response);
      setFuncionarios(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Criar (POST)
  const createFuncionario = async (formData) => {
    setIsLoading(true);
    setError(null);

    // Cadastro simplificado: apenas nome, e-mail, senha e nível de acesso
    const payload = {
      Nome: formData.nome.trim(),
      Email: formData.email.toLowerCase().trim(),
      Senha: formData.senha,
      Tipo: String(formData.tipo).toUpperCase()
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload), 
      });

      // O backend retorna o UsuarioResponseDTO no método POST[cite: 2, 3]
      const novoUsuario = await handleResponse(response);
      
      // ERRO DE UX CORRIGIDO: Atualiza a lista local imediatamente sem novo GET
      setFuncionarios((prev) => [...prev, novoUsuario]);

      // CONTRATO CORRIGIDO: Retorna o mesmo padrão dos outros métodos
      return { success: true, data: novoUsuario };
    } catch (err) {
      setError(err.message);
      // Evite `throw err` se o componente espera checar `result.success`
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Atualizar (PUT)
  const updateFuncionario = async (id, UsuarioDTO) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const payload = {
        Nome: UsuarioDTO.nome,
        Email: UsuarioDTO.email,
        Telefone: UsuarioDTO.telefone,
        Tipo: UsuarioDTO.tipo,
        Ativo: UsuarioDTO.ativo
      };

      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      
      await handleResponse(response);

      // O PUT responde 204 (sem corpo), então atualizamos o registro local em
      // camelCase — o formato que a tabela consome. Mesclar o payload PascalCase
      // direto no objeto apagaria f.nome/f.email e sumiria a linha da tela.
      setFuncionarios((prev) => 
        prev.map((f) => (f.id === id ? {
          ...f,
          nome: payload.Nome,
          email: payload.Email,
          tipo: payload.Tipo,
          ativo: payload.Ativo,
        } : f))
      );
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Alternar Status (DELETE / PUT)
  const toggleStatus = async (funcionario) => {
    setIsLoading(true);
    setError(null);
    const novoStatus = !funcionario.ativo;

    try {
      let response;
      
      if (!novoStatus) {
        response = await fetch(`${API_BASE_URL}/${funcionario.id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
      } else {
        const payload = {
            Nome: funcionario.nome,
            Email: funcionario.email,
            Telefone: funcionario.telefone,
            Tipo: funcionario.tipo,
            Ativo: true
        };
        response = await fetch(`${API_BASE_URL}/${funcionario.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      }

      await handleResponse(response);

      setFuncionarios((prev) =>
        prev.map((f) => (f.id === funcionario.id ? { ...f, ativo: novoStatus } : f))
      );
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // --- Redefinição de senha pelo ADMIN (PUT /usuario/{id}/senha) ---
  const redefinirSenha = async (id, senha) => {
    setIsLoading(true);
    setError(null);
    try {
      // API_BASE_URL já aponta para .../api/usuario — não repetir o segmento
      const response = await fetch(`${API_BASE_URL}/${id}/senha`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ senha }),
      });
      await handleResponse(response);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    funcionarios,
    isLoading,
    error,
    fetchFuncionarios,
    createFuncionario,
    updateFuncionario,
    toggleStatus,
    redefinirSenha,
  };
}