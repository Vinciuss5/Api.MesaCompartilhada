import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Em Android (emulador), o backend roda na maquina host em 10.0.2.2.
// Em navegador/desktop, mantemos localhost. Sobrescreva com VITE_API_URL se necessario.
const API_BASE_URL = import.meta.env.VITE_API_URL
  || (Capacitor.isNativePlatform() ? 'http://10.0.2.2:5235/api' : 'http://localhost:5235/api');

const api = axios.create({
  baseURL: API_BASE_URL,
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
    const token = localStorage.getItem('@ONG:token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;