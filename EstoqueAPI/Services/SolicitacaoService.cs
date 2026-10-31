using AutoMapper;
using EstoqueAPI.Data;
using EstoqueAPI.DTOs;
using EstoqueAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace EstoqueAPI.Services
{
    public class SolicitacaoService : ISolicitacaoService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public SolicitacaoService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<SolicitacaoResponseDTO>> ListarTodasAsync()
        {
            var solicitacoes = await _context.Solicitacoes
                .Include(s => s.Solicitante)
                .Include(s => s.Itens).ThenInclude(i => i.Produto)
                .AsNoTracking()
                .OrderByDescending(s => s.DataSolicitacao)
                .ToListAsync();

            return _mapper.Map<IEnumerable<SolicitacaoResponseDTO>>(solicitacoes);
        }

        public async Task<SolicitacaoResponseDTO> CriarAsync(SolicitacaoCreateDTO dto)
        {
            // Padrão de Resiliência: Iniciando transação para garantir atomicidade
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var solicitacao = _mapper.Map<Solicitacao>(dto);
                solicitacao.DataSolicitacao = DateTime.UtcNow;
                solicitacao.Status = "PENDENTE";

                _context.Solicitacoes.Add(solicitacao);
                // Salvamos primeiro para gerar o ID da solicitação que será usado nos itens
                await _context.SaveChangesAsync();

                foreach (var itemDto in dto.Itens)
                {
                    // 1. Validação de Saldo (Agora usando decimal)
                    decimal saldoTotal = await _context.Estoque
                        .Where(e => e.ProdutoId == itemDto.ProdutoId)
                        .SumAsync(e => e.Quantidade);

                    if (saldoTotal < itemDto.Quantidade)
                    {
                        var produto = await _context.Produtos.FindAsync(itemDto.ProdutoId);
                        string nomeProduto = produto?.Nome ?? $"ID {itemDto.ProdutoId}";
                        throw new InvalidOperationException($"Saldo insuficiente para {nomeProduto}. Disponível: {saldoTotal}kg/un. Solicitado: {itemDto.Quantidade}kg/un.");
                    }

                    // 2. Lógica de Baixa de Estoque (PVPS - Primeiro que Vence, Primeiro que Sai)
                    var lotesEstoque = await _context.Estoque
                        .Where(e => e.ProdutoId == itemDto.ProdutoId && e.Quantidade > 0)
                        .OrderBy(e => e.DataValidade) // Garante que itens vencendo logo saiam antes
                        .ToListAsync();

                    // CORREÇÃO: quantidadeNecessaria agora é decimal
                    decimal quantidadeNecessaria = itemDto.Quantidade;

                    foreach (var lote in lotesEstoque)
                    {
                        if (quantidadeNecessaria <= 0) break;

                        if (lote.Quantidade >= quantidadeNecessaria)
                        {
                            lote.Quantidade -= quantidadeNecessaria;
                            quantidadeNecessaria = 0;
                        }
                        else
                        {
                            quantidadeNecessaria -= lote.Quantidade;
                            lote.Quantidade = 0;
                        }
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return await BuscarPorIdAsync(solicitacao.Id)
                    ?? throw new Exception("Erro ao recuperar solicitação criada.");
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                // Repassamos a exceção original ou uma personalizada para o Controller tratar
                throw;
            }
        }

        public async Task<SolicitacaoResponseDTO?> BuscarPorIdAsync(int id)
        {
            var solicitacao = await _context.Solicitacoes
                .Include(s => s.Solicitante)
                .Include(s => s.Itens)
                    .ThenInclude(i => i.Produto)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id);

            return _mapper.Map<SolicitacaoResponseDTO>(solicitacao);
        }

        public async Task<bool> AtualizarStatusAsync(int id, string novoStatus, string? responsavel = null)
        {
            var novoStatusUpper = novoStatus.ToUpper();

            // 1. Iniciamos uma estratégia de execução e transação
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Carregamos a solicitação com os itens (necessário para o estorno)
                    var solicitacao = await _context.Solicitacoes
                        .Include(s => s.Itens)
                        .FirstOrDefaultAsync(s => s.Id == id);

                    if (solicitacao == null) return false;

                    // Validação de Máquina de Estados (SRP)
                    if (solicitacao.Status == novoStatusUpper) return true; // Já está no status
                    if (solicitacao.Status == "CANCELADO" || solicitacao.Status == "ENTREGUE")
                    {
                        throw new InvalidOperationException($"Impossível alterar: Solicitação já está {solicitacao.Status}.");
                    }

                    // 2. Lógica de Estorno de Estoque
                    if (novoStatusUpper == "CANCELADO" && solicitacao.Status == "PENDENTE")
                    {
                        foreach (var item in solicitacao.Itens)
                        {
                            // Tentamos encontrar o lote exato no estoque para devolver. 
                            // Nota: Se você usa controle por Validade, precisamos garantir que o item da solicitação guarde essa info ou o lote id.
                            var estoqueItem = await _context.Estoque
                                .FirstOrDefaultAsync(e => e.ProdutoId == item.ProdutoId);

                            if (estoqueItem != null)
                            {
                                estoqueItem.Quantidade += item.Quantidade;
                            }
                            else
                            {
                                // Caso o lote tenha sido deletado por erro humano, criamos um novo registro de devolução
                                _context.Estoque.Add(new Estoque
                                {
                                    ProdutoId = item.ProdutoId,
                                    Quantidade = item.Quantidade,
                                    Origem = $"Estorno Solicitação #{solicitacao.Id}",
                                    DataEntrada = DateTime.UtcNow
                                });
                            }
                        }
                    }

                    // 3. Atualiza o Status (e registra a confirmação de entrega)
                    solicitacao.Status = novoStatusUpper;

                    if (novoStatusUpper == "ENTREGUE")
                    {
                        solicitacao.DataEntrega = DateTime.UtcNow;
                        solicitacao.EntreguePor = responsavel ?? "Não informado";
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
    }
}