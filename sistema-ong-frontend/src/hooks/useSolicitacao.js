import { useState, useCallback } from 'react';
import { authHeaders } from '../services/authHeaders';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';

export const useSolicitacao = () => {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // GET: Lista todas as solicitações (Histórico)
  const fetchSolicitacoes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/solicitacao`, { headers: authHeaders() });
      if (!response.ok) throw new Error('Erro ao carregar as solicitações.');
      
      const data = await response.json();
      setSolicitacoes(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // POST: Cria uma nova solicitação
  const criarSolicitacao = useCallback(async (novaSolicitacao) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/solicitacao`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(novaSolicitacao),
      });

      const data = await response.json();

      if (!response.ok) {
        // Captura a mensagem de erro de regra de negócio do C# (ex: saldo insuficiente)
        throw new Error(data.message || 'Erro ao criar solicitação.');
      }

      // Atualiza a lista local adicionando a nova solicitação no topo
      setSolicitacoes((prev) => [data, ...prev]);
      return { sucesso: true, data };
    } catch (err) {
      console.error(err);
      setError(err.message);
      return { sucesso: false, erro: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // PATCH: Atualiza o status (PENDENTE, ENTREGUE, CANCELADO)
  const atualizarStatus = useCallback(async (id, novoStatus) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/solicitacao/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ novoStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao atualizar status.');
      }

      // Atualiza o status localmente para evitar um GET
      setSolicitacoes((prev) => 
        prev.map((sol) => sol.id === id ? { ...sol, status: novoStatus } : sol)
      );

      // O PATCH responde 204 (sem corpo), então DataEntrega/EntreguePor gravados
      // no servidor só chegam num novo GET — sem isso a tela de rastreabilidade
      // mostraria "Não registrada"/"Não informado" até o próximo carregamento.
      await fetchSolicitacoes();

      return { sucesso: true };
    } catch (err) {
      console.error(err);
      setError(err.message);
      return { sucesso: false, erro: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchSolicitacoes]);

  return { 
    solicitacoes, 
    loading, 
    error, 
    fetchSolicitacoes, 
    criarSolicitacao, 
    atualizarStatus 
  };
};