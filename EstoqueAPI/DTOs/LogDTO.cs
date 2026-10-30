namespace EstoqueAPI.DTOs
{
    /// <summary>
    /// Item da trilha de auditoria (quem fez o quê e quando).
    /// </summary>
    public record LogResponseDTO(
        int Id,
        string UsuarioNome,
        string UsuarioEmail,
        string Acao,
        DateTime DataHora
    );
}
