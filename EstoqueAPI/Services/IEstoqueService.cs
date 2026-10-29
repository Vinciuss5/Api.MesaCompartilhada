using EstoqueAPI.DTOs;

namespace EstoqueAPI.Services
{
    public interface IEstoqueService
    {
        Task<IEnumerable<EstoqueResponseDTO>> ListarEstoqueAtualAsync();
        Task<EstoqueResponseDTO?> BuscarSaldoPorProdutoAsync(int produtoId);
        Task<IEnumerable<EstoqueResponseDTO>> ListarProdutosComBaixoEstoqueAsync(int limite);
    }
}