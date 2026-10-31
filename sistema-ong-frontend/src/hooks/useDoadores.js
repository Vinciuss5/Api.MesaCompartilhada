// src/hooks/useDoadores.js
import { useState, useCallback, useRef } from 'react';
import { authHeaders } from '../services/authHeaders';

// Cache em módulo: sobrevive entre montagens da página (mas some se recarregar o navegador)
let cacheDoadores = [];

export const useDoadores = () => {
  const [doadores, setDoadores] = useState(cacheDoadores);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const primeiraExecucaoRef = useRef(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';
  const DOADOR_URL = `${API_URL}/doador`;

  const fetchDoadores = useCallback(async (search = '') => {
    // Só mostra o loading se não tivermos nada em cache ainda
    if (cacheDoadores.length === 0) setLoading(true);
    setError(null);
    try {
      const url = search ? `${DOADOR_URL}?filtro=${encodeURIComponent(search)}` : DOADOR_URL;
      const response = await fetch(url, { headers: authHeaders() });
      if (!response.ok) throw new Error('Erro ao carregar doadores');
      const data = await response.json();
      cacheDoadores = data;
      setDoadores(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createDoador = async (DoadorDTO) => {
    const response = await fetch(DOADOR_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(DoadorDTO)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao cadastrar');
    }
    return await response.json();
  };

  // --- Edição (PUT /doador/{id}) ---
  const updateDoador = async (id, DoadorDTO) => {
    const response = await fetch(`${DOADOR_URL}/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(DoadorDTO)
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao atualizar o doador');
    }
    // Recarrega a lista para refletir a alteração
    await fetchDoadores();
    return true;
  };

  // --- Exclusão lógica: desativar (DELETE /doador/{id}) ---
  const desativarDoador = async (id) => {
    const response = await fetch(`${DOADOR_URL}/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao desativar o doador');
    }
    await fetchDoadores();
    return true;
  };

  // --- Reativar um doador desativado (POST /doador/{id}/restaurar) ---
  const restaurarDoador = async (id) => {
    const response = await fetch(`${DOADOR_URL}/${id}/restaurar`, {
      method: 'POST',
      headers: authHeaders()
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Erro ao reativar o doador');
    }
    await fetchDoadores();
    return true;
  };

  return { doadores, loading, error, fetchDoadores, createDoador, updateDoador, desativarDoador, restaurarDoador, primeiraExecucaoRef };
};