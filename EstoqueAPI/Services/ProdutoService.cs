using AutoMapper;
using EstoqueAPI.Data;
using EstoqueAPI.DTOs;
using EstoqueAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace EstoqueAPI.Services
{
    public class ProdutoService : IProdutoService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public ProdutoService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<ProdutoResponseDTO>> ListarTodosAsync()
        {
            var produtos = await _context.Produtos
                .AsNoTracking()
                .OrderBy(p => p.Nome)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ProdutoResponseDTO>>(produtos);
        }

        public async Task<ProdutoResponseDTO?> BuscarPorIdAsync(int id)
        {
            var produto = await _context.Produtos.FindAsync(id);
            return _mapper.Map<ProdutoResponseDTO>(produto);
        }

        public async Task<ProdutoResponseDTO> CriarAsync(ProdutoCreateDTO dto)
        {
            var produto = _mapper.Map<Produto>(dto);

            _context.Produtos.Add(produto);
            await _context.SaveChangesAsync();

            return _mapper.Map<ProdutoResponseDTO>(produto);
        }

        public async Task<bool> AtualizarAsync(int id, ProdutoUpdateDTO dto)
        {
            var produtoExistente = await _context.Produtos.FindAsync(id);

            if (produtoExistente == null) return false;

            // Mapeia as alterações do DTO para a Model já rastreada pelo EF
            _mapper.Map(dto, produtoExistente);

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ExcluirAsync(int id)
        {
            var produto = await _context.Produtos.FindAsync(id);

            if (produto == null) return false;

            _context.Produtos.Remove(produto);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}