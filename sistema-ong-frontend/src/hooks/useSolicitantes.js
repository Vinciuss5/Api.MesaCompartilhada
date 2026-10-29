// src/hooks/useSolicitantes.js
import { useState, useCallback, useRef } from 'react';
import { authHeaders } from '../services/authHeaders';

let cacheSolicitantes = [];

export const useSolicitantes = () => {
  const [solicitantes, setSolicitantes] = useState(cacheSolicitantes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const primeiraExecucao = useRef(true);

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

  return {
    solicitantes,
    loading,
    error,
    fetchSolicitantes,
    createSolicitante,
    primeiraExecucao
  };
};