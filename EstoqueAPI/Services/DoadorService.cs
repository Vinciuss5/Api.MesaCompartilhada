using AutoMapper;
using EstoqueAPI.Data;
using EstoqueAPI.DTOs;
using EstoqueAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace EstoqueAPI.Services
{
    public class DoadorService : IDoadorService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public DoadorService(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<DoadorResponseDTO>> ListarTodosAsync(string? filtro)
        {
            // Iniciamos com IQueryable para compor a query no banco de dados (Server-side)
            // O AsNoTracking() é essencial aqui: ganho de performance em consultas de leitura.
            var query = _context.Doadores.AsNoTracking();

            // Se o filtro não for nulo ou vazio, aplicamos a lógica de busca
            if (!string.IsNullOrWhiteSpace(filtro))
            {
                filtro = filtro.Trim();

                // O EF Core traduzirá isso para um comando SQL "WHERE Nome LIKE '%termo%' OR ..."
                query = query.Where(d =>
                            (d.Nome != null && d.Nome.Contains(filtro)) ||
                            (d.Email != null && d.Email.Contains(filtro)) ||
                            (d.CPF != null && d.CPF.Contains(filtro)));
            }

            var doadores = await query
                .OrderBy(d => d.Nome)
                .ToListAsync();

            return _mapper.Map<IEnumerable<DoadorResponseDTO>>(doadores);
        }

        public async Task<DoadorResponseDTO?> BuscarPorIdAsync(int id)
        {
            var doador = await _context.Doadores.FindAsync(id);
            return _mapper.Map<DoadorResponseDTO>(doador);
        }

        public async Task<DoadorResponseDTO> CriarAsync(DoadorCreateDTO dto)
        {
            // RN: Verificar se já existe doador com o mesmo CPF (se informado)
            if (!string.IsNullOrEmpty(dto.CPF))
            {
                bool existe = await _context.Doadores.AnyAsync(d => d.CPF == dto.CPF);
                if (existe) throw new Exception("Já existe um doador cadastrado com este CPF.");
            }

            var doador = _mapper.Map<Doador>(dto);

            _context.Doadores.Add(doador);
            await _context.SaveChangesAsync();

            return _mapper.Map<DoadorResponseDTO>(doador);
        }

        public async Task<bool> AtualizarAsync(int id, DoadorUpdateDTO dto)
        {
            var doadorExistente = await _context.Doadores.FindAsync(id);

            if (doadorExistente == null) return false;

            // RN: CPF duplicado em atualização (só valida se o CPF mudou e foi informado)
            if (!string.IsNullOrWhiteSpace(dto.CPF) && doadorExistente.CPF != dto.CPF)
            {
                var cpfEmUso = await _context.Doadores.AnyAsync(d => d.CPF == dto.CPF && d.Id != id);
                if (cpfEmUso)
                    throw new InvalidOperationException("Já existe um doador cadastrado com este CPF.");
            }

            // Mapeia as alterações do DTO para a Model rastreada
            _mapper.Map(dto, doadorExistente);

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ExcluirAsync(int id)
        {
            var doador = await _context.Doadores.FindAsync(id);

            if (doador == null) return false;

            // Exclusão LÓGICA: mantém o histórico de doações vinculadas intacto
            doador.Ativo = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RestaurarAsync(int id)
        {
            var doador = await _context.Doadores.FindAsync(id);
            if (doador == null) return false;

            doador.Ativo = true;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}