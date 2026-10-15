using EstoqueAPI.DTOs;
using EstoqueAPI.Services;
using Microsoft.AspNetCore.Authorization; // 1. Habilita o atributo de segurança
using Microsoft.AspNetCore.Mvc;

namespace EstoqueAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // 2. Blindagem Operacional: Admins e Funcionários podem gerenciar o catálogo de produtos
    //[Authorize(Roles = "ADMIN,FUNCIONARIO")]
    public class ProdutoController : ControllerBase
    {
        private readonly IProdutoService _service;

        public ProdutoController(IProdutoService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProdutoResponseDTO>>> Get()
        {
            var produtos = await _service.ListarTodosAsync();
            return Ok(produtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProdutoResponseDTO>> GetById(int id)
        {
            var produto = await _service.BuscarPorIdAsync(id);

            if (produto == null)
                return NotFound(new { message = $"Produto com ID {id} não encontrado." });

            return Ok(produto);
        }

        [HttpPost]
        public async Task<ActionResult<ProdutoResponseDTO>> Post([FromBody] ProdutoCreateDTO dto)
        {
            // O [ApiController] já faz a validação automática do ModelState
            var resultado = await _service.CriarAsync(dto);

            return CreatedAtAction(nameof(GetById), new { id = resultado.Id }, resultado);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] ProdutoUpdateDTO dto)
        {
            var atualizado = await _service.AtualizarAsync(id, dto);

            if (!atualizado)
                return NotFound(new { message = $"Não foi possível atualizar. Produto ID {id} não encontrado." });

            return NoContent();
        }

        [HttpDelete("{id}")]
        // Dica de Tech Lead: Se quiser ser mais rigoroso, pode restringir a exclusão de produtos
        // apenas para administradores descomentando a linha abaixo:
        // [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> Delete(int id)
        {
            var excluido = await _service.ExcluirAsync(id);

            if (!excluido)
                return NotFound(new { message = $"Não foi possível excluir. Produto ID {id} não encontrado." });

            return NoContent();
        }
    }
}