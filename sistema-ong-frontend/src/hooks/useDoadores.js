// src/hooks/useDoadores.js
import { useState, useCallback, useRef } from 'react';

// Cache em módulo: sobrevive entre montagens da página (mas some se recarregar o navegador)
let cacheDoadores = [];

export const useDoadores = () => {
  const [doadores, setDoadores] = useState(cacheDoadores);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const primeiraExecucao = useRef(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';
  const DOADOR_URL = `${API_URL}/doador`;

  const fetchDoadores = useCallback(async (search = '') => {
    // Só mostra o loading se não tivermos nada em cache ainda
    if (cacheDoadores.length === 0) setLoading(true);
    setError(null);
    try {
      const url = search ? `${DOADOR_URL}?filtro=${encodeURIComponent(search)}` : DOADOR_URL;
      const response = await fetch(url);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DoadorDTO)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao cadastrar');
    }
    return await response.json();
  };

  return { doadores, loading, error, fetchDoadores, createDoador, primeiraExecucao };
};