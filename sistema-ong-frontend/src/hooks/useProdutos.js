// src/hooks/useProdutos.js
import { useState, useCallback } from 'react';
import { authHeaders } from '../services/authHeaders';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';

export const useProdutos = () => {
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchProdutos = useCallback(async () => {
        setLoading(true);
        try {
            // Supondo que você tenha um endpoint GET /api/produto
            const response = await fetch(`${API_URL}/produto`, { headers: authHeaders() });
            if (response.ok) {
                const data = await response.json();
                setProdutos(data);
            }
        } catch (err) {
            console.error("Erro ao carregar produtos:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { produtos, loading, fetchProdutos };
};