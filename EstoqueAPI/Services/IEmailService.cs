namespace EstoqueAPI.Services
{
    public interface IEmailService
    {
        /// <summary>
        /// Envia um e-mail via SMTP. Retorna false se o SMTP não estiver
        /// configurado (o chamador decide o que fazer — ex.: registrar o link no log).
        /// </summary>
        Task<bool> EnviarAsync(string para, string assunto, string corpoHtml);
    }
}
