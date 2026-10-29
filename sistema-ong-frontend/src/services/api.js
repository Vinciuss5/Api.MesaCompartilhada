import axios from 'axios';

const api = axios.create({
  // Em produção usa VITE_API_URL (relativa: /api); em dev, localhost.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * INTERCEPTOR DE REQUISIÇÃO
 * Este código será executado ANTES de cada chamada à API.
 * Ele busca o token no localStorage e, se existir, coloca no padrão Bearer.
 */
api.interceptors.request.use(
  (config) => {
    // Usamos o prefixo '@ONG' para evitar conflitos com outros sites no mesmo computador
    const token = localStorage.getItem('@MesaCompartilhada:token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Caso ocorra um erro antes mesmo de enviar a requisição
    return Promise.reject(error);
  }
);

export default api;