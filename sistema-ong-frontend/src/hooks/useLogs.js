// src/hooks/useLogs.js
import { useState, useCallback } from 'react';
import { authHeaders } from '../services/authHeaders';

export const useLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';

  const fetchLogs = useCallback(async (top = 100) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/log?top=${top}`, { headers: authHeaders() });
      if (!response.ok) throw new Error('Erro ao carregar a auditoria');
      const data = await response.json();
      setLogs(data);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { logs, loading, error, fetchLogs };
};
