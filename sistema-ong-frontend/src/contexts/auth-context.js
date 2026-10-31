// src/contexts/auth-context.js
// O contexto mora num arquivo próprio (sem componente exportado) para que o
// Fast Refresh continue funcionando — regra react-refresh/only-export-components.
import { createContext } from 'react';

export const AuthContext = createContext({});
