import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5235/api';
const ESTOQUE_URL = `${API_BASE_URL}/estoque`;
const PRODUTO_URL = `${API_BASE_URL}/produto`;

export function useEstoque() {
  const [estoque, setEstoque] = useState([]);
  const [alertasBaixoEstoque, setAlertasBaixoEstoque] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
  });

  const handleResponse = async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const serverMessage = errorData.message || 
                            (errorData.errors ? Object.values(errorData.errors).flat().join(", ") : null);
      throw new Error(serverMessage || 'Erro de comunicação com o servidor.');
    }
    return response.status === 204 ? null : response.json();
  };

  // 1. Listar Estoque Geral
  const fetchEstoque = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(ESTOQUE_URL, { headers: getHeaders() });
      const data = await handleResponse(response);
      
      // FILTRO: Removemos itens com quantidade 0 para não ocuparem espaço no relatório/lista
      const estoqueFormatado = data
        .filter(item => item.quantidade > 0) // <--- GARANTE QUE ITENS ZERADOS NÃO APAREÇAM
        .map(item => ({
          id: item.id,
          produtoId: item.produtoId,
          nome: item.produtoNome,
          qtd: item.quantidade,
          status: item.status,
          peso: item.peso,
          origem: item.origem,
          validade: item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : 'N/A',
          lote: item.loteCodigo || 'N/A', 
          entrada: item.dataEntrada ? new Date(item.dataEntrada).toLocaleDateString('pt-BR') : 'N/A'
        }));

      setEstoque(estoqueFormatado);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Buscar Alertas de Baixo Estoque
  const fetchBaixoEstoque = useCallback(async (limite = 5) => {
    try {
      const response = await fetch(`${ESTOQUE_URL}/baixo-estoque?limite=${limite}`, { headers: getHeaders() });
      const data = await handleResponse(response);
      
      // FILTRO: Baixo estoque significa que tem POUCO, não que tem ZERO.
      // Se tiver zero, ele já saiu do estoque físico.
      const apenasComAlgumaQuantidade = data.filter(item => item.quantidade > 0);
      
      setAlertasBaixoEstoque(apenasComAlgumaQuantidade);
    } catch (err) {
      console.error("Erro ao buscar alertas de estoque:", err);
    }
  }, []);

  // 3. Cadastrar Novo Produto
  const createProduto = async (produtoData) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        Nome: produtoData.nome.trim(),
        PesoKg: produtoData.peso ? parseFloat(produtoData.peso) : null
      };

      const response = await fetch(PRODUTO_URL, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const novoProduto = await handleResponse(response);
      return { success: true, data: novoProduto };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    estoque,
    alertasBaixoEstoque,
    isLoading,
    error,
    fetchEstoque,
    fetchBaixoEstoque,
    createProduto,
  };
}