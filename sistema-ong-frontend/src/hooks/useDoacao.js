// src/hooks/useDoacao.js
import { useState, useCallback } from 'react';
import { authHeaders } from '../services/authHeaders';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';

export const useDoacao = () => {
    const [doacoesHistorico, setDoacoesHistorico] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const getHeaders = () => authHeaders();

    // GET: Buscar histórico
    const fetchDoacoes = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/doacao`, { headers: getHeaders() });
            if (!response.ok) throw new Error('Erro ao buscar o histórico de doações.');
            
            const data = await response.json();
            
            // "Achatando" a resposta: Cada item vira uma linha na tabela de histórico
            const historicoFormatado = [];
            data.forEach(doacao => {
                const dataFormatada = new Date(doacao.data).toLocaleDateString('pt-BR');
                doacao.itens.forEach(item => {
                    historicoFormatado.push({
                        idId: item.id, // ID interno do item (para chave do React)
                        idDisplay: `ENT-${doacao.id.toString().padStart(4, '0')}`, // Ex: ENT-0042
                        data: dataFormatada,
                        doador: doacao.nomeDoador,
                        produto: item.nomeProduto,
                        quantidade: `${item.quantidade} un`,
                        validade: item.dataValidade ? new Date(item.dataValidade).toLocaleDateString('pt-BR') : 'N/A'
                    });
                });
            });

            setDoacoesHistorico(historicoFormatado);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // POST: Criar nova doação
    const createDoacao = async (payload) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/doacao`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erro ao registrar entrada.');
            }

            const data = await response.json();
            return { success: true, data };
        } catch (err) {
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setIsLoading(false);
        }
    };

    return { doacoesHistorico, isLoading, error, fetchDoacoes, createDoacao };
};