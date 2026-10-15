using AutoMapper;
using EstoqueAPI.Data;
using EstoqueAPI.DTOs;
using EstoqueAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace EstoqueAPI.Services
{
    public class DoacaoService : IDoacaoService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<DoacaoService> _logger;

        public DoacaoService(AppDbContext context, IMapper mapper, ILogger<DoacaoService> logger)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<IEnumerable<DoacaoResponseDTO>> ListarTodasAsync()
        {
            var doacoes = await _context.Doacoes
                .Include(d => d.Doador)
                .Include(d => d.Itens)
                    .ThenInclude(i => i.Produto)
                .AsNoTracking()
                .OrderByDescending(d => d.Data)
                .ToListAsync();

            return _mapper.Map<IEnumerable<DoacaoResponseDTO>>(doacoes);
        }

        public async Task<DoacaoResponseDTO> CriarAsync(DoacaoCreateDTO dto)
        {
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                // Inicia a transação. O 'using' garante o Rollback automático se o Commit não for chamado.
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    // 1. Mapeamento e Persistência da Doação
                    var doacao = _mapper.Map<Doacao>(dto);
                    _context.Doacoes.Add(doacao);

                    // Salvamos para gerar o ID da doação e validar chaves estrangeiras (Doador/Produto)
                    await _context.SaveChangesAsync();

                    // 2. Processamento do Estoque (Lógica de Negócio)
                    foreach (var item in doacao.Itens)
                    {
                        var estoqueItem = await _context.Estoque
                            .FirstOrDefaultAsync(e => e.ProdutoId == item.ProdutoId && e.DataValidade == item.DataValidade);

                        if (estoqueItem != null)
                        {
                            estoqueItem.Quantidade += item.Quantidade;
                            estoqueItem.DataEntrada = doacao.Data;
                        }
                        else
                        {
                            _context.Estoque.Add(new Estoque
                            {
                                ProdutoId = item.ProdutoId,
                                Quantidade = item.Quantidade,
                                DataValidade = item.DataValidade,
                                DataEntrada = doacao.Data,
                                Origem = $"Doação #{doacao.Id}"
                            });
                        }
                    }

                    // 3. Salva as alterações de estoque
                    await _context.SaveChangesAsync();

                    // 4. Finalização
                    await transaction.CommitAsync();

                    // Recarga eficiente para retorno
                    var resultado = await _context.Doacoes
                        .Include(d => d.Doador)
                        .Include(d => d.Itens).ThenInclude(i => i.Produto)
                        .AsNoTracking()
                        .FirstOrDefaultAsync(d => d.Id == doacao.Id);

                    return _mapper.Map<DoacaoResponseDTO>(resultado);
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Erro de persistência ao salvar doação.");
                    // Não chamamos Rollback manual aqui para evitar o erro de 'Transaction Completed'
                    throw new InvalidOperationException("Erro de integridade no banco de dados. Verifique se o Doador e os Produtos existem.", ex);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Falha inesperada no processamento da doação.");
                    throw;
                }
            });
        }
    }
}