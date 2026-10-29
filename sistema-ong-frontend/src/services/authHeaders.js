// src/services/authHeaders.js
// Helper central: monta os headers de todas as chamadas à API,
// incluindo o token JWT (Bearer) quando o usuário está logado.

export function authHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = localStorage.getItem('@MesaCompartilhada:token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
