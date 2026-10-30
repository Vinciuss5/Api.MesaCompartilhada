// src/hooks/useDashboard.js
import { useState, useCallback } from 'react';
import { authHeaders } from '../services/authHeaders';

export const useDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/dashboard`, { headers: authHeaders() });
      if (!response.ok) throw new Error('Erro ao carregar o painel');
      const data = await response.json();
      setDashboard(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { dashboard, loading, error, fetchDashboard };
};
