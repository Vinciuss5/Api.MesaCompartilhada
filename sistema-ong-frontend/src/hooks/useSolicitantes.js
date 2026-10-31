// src/hooks/useSolicitantes.js
import { useState, useCallback, useRef } from 'react';
import { authHeaders } from '../services/authHeaders';

let cacheSolicitantes = [];

export const useSolicitantes = () => {
  const [solicitantes, setSolicitantes] = useState(cacheSolicitantes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const primeiraExecucaoRef = useRef(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';
  const SOLICITANTE_URL = `${API_URL}/solicitante`;

  const fetchSolicitantes = useCallback(async (search = '') => {
    if (cacheSolicitantes.length === 0) setLoading(true);
    setError(null);
    try {
      const url = search 
        ? `${SOLICITANTE_URL}?search=${encodeURIComponent(search)}` 
        : SOLICITANTE_URL;

      const response = await fetch(url, { headers: authHeaders() });
      if (!response.ok) throw new Error('Erro ao buscar solicitantes.');

      const data = await response.json();
      cacheSolicitantes = data;
      setSolicitantes(data);
    } catch (err) {
      setError(err.message);
      console.error("Erro na busca:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSolicitante = async (SolicitanteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(SOLICITANTE_URL, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(SolicitanteDTO),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao cadastrar solicitante.');
      }

      const novoSolicitante = await response.json();
      cacheSolicitantes = [novoSolicitante, ...cacheSolicitantes];
      setSolicitantes(cacheSolicitantes);

      return { success: true, data: novoSolicitante };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // --- Edição (PUT /solicitante/{id}) ---
  const updateSolicitante = async (id, SolicitanteDTO) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SOLICITANTE_URL}/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(SolicitanteDTO),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao atualizar o solicitante.');
      }
      await fetchSolicitantes();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // --- Exclusão lógica: desativar (mantém histórico) ---
  const desativarSolicitante = async (id) => {
    const response = await fetch(`${SOLICITANTE_URL}/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao desativar o solicitante.');
    }
    await fetchSolicitantes();
    return true;
  };

  // --- Reativar um solicitante desativado ---
  const restaurarSolicitante = async (id) => {
    const response = await fetch(`${SOLICITANTE_URL}/${id}/restaurar`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao reativar o solicitante.');
    }
    await fetchSolicitantes();
    return true;
  };

  return {
    solicitantes,
    loading,
    error,
    fetchSolicitantes,
    createSolicitante,
    updateSolicitante,
    desativarSolicitante,
    restaurarSolicitante,
    primeiraExecucaoRef
  };
};