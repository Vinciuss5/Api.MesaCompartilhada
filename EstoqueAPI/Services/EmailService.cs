using System.Net;
using System.Net.Mail;

namespace EstoqueAPI.Services
{
    /// <summary>
    /// Envio de e-mail via SMTP configurado por variáveis de ambiente no Render:
    ///   Smtp__Host, Smtp__Port, Smtp__From, Smtp__User, Smtp__Pass
    /// Ex. (Gmail): Smtp__Host=smtp.gmail.com, Smtp__Port=587,
    ///     Smtp__User=voce@gmail.com, Smtp__Pass=<senha de aplicativo do Google>,
    ///     Smtp__From=voce@gmail.com
    /// Sem configuração, retorna false e a aplicação registra o link no log.
    /// </summary>
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task<bool> EnviarAsync(string para, string assunto, string corpoHtml)
        {
            var host = _config["Smtp:Host"];
            if (string.IsNullOrWhiteSpace(host))
                return false; // SMTP não configurado: quem chama decide (log do link)

            var port = int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
            var from = _config["Smtp:From"] ?? _config["Smtp:User"] ?? "noreply@mesacompartilhada.com";
            var user = _config["Smtp:User"];
            var pass = _config["Smtp:Pass"];

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            if (!string.IsNullOrWhiteSpace(user))
                client.Credentials = new NetworkCredential(user, pass);

            using var msg = new MailMessage(from, para)
            {
                Subject = assunto,
                Body = corpoHtml,
                IsBodyHtml = true
            };

            try
            {
                await client.SendMailAsync(msg);
                _logger.LogInformation("E-mail enviado para {Para}.", para);
                return true;
            }
            catch (Exception ex)
            {
                // Nunca derruba a requisição por falha de e-mail
                _logger.LogError(ex, "Falha ao enviar e-mail para {Para}.", para);
                return false;
            }
        }
    }
}
