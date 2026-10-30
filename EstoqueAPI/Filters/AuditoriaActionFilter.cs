using EstoqueAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace EstoqueAPI.Filters
{
    /// <summary>
    /// Auditoria automática: grava em "Logs" toda requisição de mutação
    /// (POST/PUT/PATCH/DELETE) autenticada que terminou com sucesso.
    /// Assim "quem fez o quê e quando" é registrado sem tocar em cada service.
    /// </summary>
    public class AuditoriaActionFilter : IAsyncActionFilter
    {
        private static readonly HashSet<string> MetodosComAuditoria = new()
        {
            "POST", "PUT", "PATCH", "DELETE"
        };

        private readonly ILogService _logService;

        public AuditoriaActionFilter(ILogService logService)
        {
            _logService = logService;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var resultado = await next(); // executa a ação normalmente

            try
            {
                var httpMethod = context.HttpContext.Request.Method;
                if (!MetodosComAuditoria.Contains(httpMethod))
                    return;

                // Só audita quem está autenticado (evita ruído de endpoints públicos)
                var idClaim = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!int.TryParse(idClaim, out var usuarioId))
                    return;

                // Só registra sucessos (4xx/5xx ficam nos logs do próprio servidor)
                var status = resultado.Result switch
                {
                    ObjectResult obj => obj.StatusCode ?? 200,
                    StatusCodeResult st => st.StatusCode,
                    _ => 200
                };
                if (status >= 400) return;

                var controller = context.ActionDescriptor.RouteValues.TryGetValue("controller", out var c)
                    ? c : "?";
                var action = context.ActionDescriptor.RouteValues.TryGetValue("action", out var a)
                    ? a : "?";
                var caminho = $"{httpMethod} {context.HttpContext.Request.Path}";

                await _logService.RegistrarAsync(usuarioId, $"{controller}.{action} — {caminho}");
            }
            catch
            {
                // Auditoria nunca pode quebrar a requisição principal
            }
        }
    }
}
