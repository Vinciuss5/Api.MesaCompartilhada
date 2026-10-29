using AutoMapper;
using EstoqueAPI.Data;
using EstoqueAPI.DTOs;
using Microsoft.EntityFrameworkCore;

namespace EstoqueAPI.Services
{
    public class EstoqueService : IEstoqueService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public EstoqueService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<EstoqueResponseDTO>> ListarEstoqueAtualAsync()
        {
            var estoque = await _context.Estoque
                            .Include(e => e.Produto) // Traz a carga da tabela Produto
                            .AsNoTracking()
                            // Ordena os zerados para o final e depois por nome do produto
                            .OrderByDescending(e => e.Quantidade > 0)
                            .ThenBy(e => e.Produto != null ? e.Produto.Nome : string.Empty)
                            .ToListAsync();

            // O AutoMapper agora vai ler o EstoqueProfile e injetar o LoteCodigo e DataEntrada corretamente
            return _mapper.Map<IEnumerable<EstoqueResponseDTO>>(estoque);
        }

        public async Task<EstoqueResponseDTO?> BuscarSaldoPorProdutoAsync(int produtoId)
        {
            // Padrão de Performance: Usar FirstOrDefaultAsync com critério de busca direto
            var item = await _context.Estoque
                .Include(e => e.Produto)
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.ProdutoId == produtoId);

            return _mapper.Map<EstoqueResponseDTO>(item);
        }

        public async Task<IEnumerable<EstoqueResponseDTO>> ListarProdutosComBaixoEstoqueAsync(int limite)
        {
            if (limite < 0) return Enumerable.Empty<EstoqueResponseDTO>();

            var baixoEstoque = await _context.Estoque
                .Include(e => e.Produto)
                // Usando < limite para garantir que "Esgotados" também entrem no radar se necessário,
                // ou você pode adicionar && e.Quantidade > 0 se quiser separar Esgotado de Baixo Estoque
                .Where(e => e.Quantidade <= (decimal)limite)
                .AsNoTracking()
                .OrderBy(e => e.Quantidade)
                .ToListAsync();

            return _mapper.Map<IEnumerable<EstoqueResponseDTO>>(baixoEstoque);
        }
    }
}