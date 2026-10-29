using System.Text;
using EstoqueAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace EstoqueAPI.Services
{
    /// <summary>
    /// Ferramenta de uso único: copia os dados do SQLite local (estoque.db)
    /// para o Postgres da nuvem (Neon), respeitando as chaves estrangeiras.
    ///
    /// Como usar (PowerShell, na raiz do projeto):
    ///   $env:ConnectionStrings__DefaultConnection = "postgresql://user:senha@host/db?sslmode=require"
    ///   dotnet run --project EstoqueAPI -- migrar-dados "EstoqueAPI\estoque.db"
    /// </summary>
    public static class MigradorDados
    {
        // Ordem respeita as chaves estrangeiras (pais antes dos filhos)
        private static readonly string[] Tabelas =
        {
            "Usuarios", "Produtos", "Doadores", "Solicitantes", "Estoque",
            "Doacoes", "DoacaoItens", "Solicitacoes", "SolicitacaoItens", "Logs"
        };

        public static async Task ExecutarAsync(string? caminhoSqlite, string? connPostgres)
        {
            caminhoSqlite ??= "estoque.db";

            if (!File.Exists(caminhoSqlite))
            {
                Console.WriteLine($"[ERRO] Arquivo SQLite não encontrado: {Path.GetFullPath(caminhoSqlite)}");
                Console.WriteLine("Passe o caminho do arquivo como argumento, ex.: migrar-dados \"EstoqueAPI\\estoque.db\"");
                Environment.ExitCode = 1;
                return;
            }

            if (string.IsNullOrWhiteSpace(connPostgres) || !PareceConexaoPostgres(connPostgres))
            {
                Console.WriteLine("[ERRO] Conexão com o Postgres não configurada.");
                Console.WriteLine("Defina a variável de ambiente ConnectionStrings__DefaultConnection");
                Console.WriteLine("com a URL do Neon (postgresql://...) e execute novamente.");
                Environment.ExitCode = 1;
                return;
            }

            var caminhoAbsoluto = Path.GetFullPath(caminhoSqlite);
            Console.WriteLine($"Origem  (SQLite) : {caminhoAbsoluto}");

            var optsOrigem = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite($"Data Source={caminhoAbsoluto}")
                .Options;

            var optsDestino = new DbContextOptionsBuilder<AppDbContext>()
                .UseNpgsql(NormalizarConnPostgres(connPostgres))
                .Options;

            await using var origem = new AppDbContext(optsOrigem);
            await using var destino = new AppDbContext(optsDestino);

            Console.WriteLine("Verificando/criando o schema no Postgres...");
            var schemaCriado = destino.Database.EnsureCreated();
            Console.WriteLine(schemaCriado
                ? "Schema criado agora."
                : "Schema já existia (serão copiados apenas registros novos).");

            await using var tx = await destino.Database.BeginTransactionAsync();

            var total = 0;
            total += await CopiarAsync(origem, destino, c => c.Usuarios, x => x.Id, "Usuarios");
            total += await CopiarAsync(origem, destino, c => c.Produtos, x => x.Id, "Produtos");
            total += await CopiarAsync(origem, destino, c => c.Doadores, x => x.Id, "Doadores");
            total += await CopiarAsync(origem, destino, c => c.Solicitantes, x => x.Id, "Solicitantes");
            total += await CopiarAsync(origem, destino, c => c.Estoque, x => x.Id, "Estoque");
            total += await CopiarAsync(origem, destino, c => c.Doacoes, x => x.Id, "Doacoes");
            total += await CopiarAsync(origem, destino, c => c.DoacaoItens, x => x.Id, "DoacaoItens");
            total += await CopiarAsync(origem, destino, c => c.Solicitacoes, x => x.Id, "Solicitacoes");
            total += await CopiarAsync(origem, destino, c => c.SolicitacaoItens, x => x.Id, "SolicitacaoItens");
            total += await CopiarAsync(origem, destino, c => c.Logs, x => x.Id, "Logs");

            // Ajusta as sequências para o próximo Id não colidir com os ids já copiados.
            // (Tabelas são constantes fixas — sem risco de injeção de SQL.)
            foreach (var tabela in Tabelas)
            {
#pragma warning disable EF1003
                await destino.Database.ExecuteSqlRawAsync(
                    $"SELECT setval(pg_get_serial_sequence('\"{tabela}\"', 'Id'), " +
                    $"COALESCE((SELECT MAX(\"Id\") FROM \"{tabela}\"), 1))");
#pragma warning restore EF1003
            }

            await tx.CommitAsync();
            Console.WriteLine($"Concluído! {total} registro(s) novo(s) copiado(s) para o Postgres.");
        }

        private static async Task<int> CopiarAsync<T>(
            AppDbContext origem,
            AppDbContext destino,
            Func<AppDbContext, DbSet<T>> set,
            Func<T, int> chave,
            string nome) where T : class
        {
            var originais = await set(origem).AsNoTracking().ToListAsync();
            var existentes = (await set(destino).AsNoTracking().ToListAsync())
                .Select(chave)
                .ToHashSet();

            var novos = originais.Where(x => !existentes.Contains(chave(x))).ToList();
            if (novos.Count == 0)
            {
                Console.WriteLine($"  {nome}: nenhum registro novo ({existentes.Count} já existentes).");
                return 0;
            }

            foreach (var entidade in novos)
                NormalizarDateTimes(entidade);

            set(destino).AddRange(novos);
            var copiados = await destino.SaveChangesAsync();
            Console.WriteLine($"  {nome}: {copiados} registro(s) copiado(s).");
            return copiados;
        }

        /// <summary>
        /// O SQLite não guarda o fuso horário. Os horários foram gravados com
        /// DateTime.Now (Brasil), então marcamos como Local para que o Postgres
        /// grave o instante correto e o site mostre o mesmo horário de antes.
        /// </summary>
        private static void NormalizarDateTimes(object entidade)
        {
            foreach (var prop in entidade.GetType().GetProperties())
            {
                if (prop.PropertyType == typeof(DateTime))
                {
                    var valor = (DateTime)prop.GetValue(entidade)!;
                    if (valor.Kind == DateTimeKind.Unspecified)
                        prop.SetValue(entidade, DateTime.SpecifyKind(valor, DateTimeKind.Local));
                }
                else if (prop.PropertyType == typeof(DateTime?))
                {
                    var valor = (DateTime?)prop.GetValue(entidade);
                    if (valor.HasValue && valor.Value.Kind == DateTimeKind.Unspecified)
                        prop.SetValue(entidade, DateTime.SpecifyKind(valor.Value, DateTimeKind.Local));
                }
            }
        }

        private static bool PareceConexaoPostgres(string conn) =>
            conn.Contains("://", StringComparison.Ordinal)
            || conn.StartsWith("Host=", StringComparison.OrdinalIgnoreCase)
            || conn.StartsWith("Server=", StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// Converte URLs no formato postgresql://user:senha@host:5432/banco?sslmode=require
        /// para o formato keyword que o Npgsql aceita com segurança.
        /// Strings já em formato keyword são devolvidas sem alteração.
        /// </summary>
        public static string NormalizarConnPostgres(string? conn)
        {
            if (string.IsNullOrWhiteSpace(conn) || !conn.Contains("://", StringComparison.Ordinal))
                return conn ?? string.Empty;

            var uri = new Uri(conn);
            var usuario = Uri.UnescapeDataString(uri.UserInfo.Split(':')[0]);
            var senha = uri.UserInfo.Contains(':')
                ? Uri.UnescapeDataString(uri.UserInfo[(uri.UserInfo.IndexOf(':') + 1)..])
                : string.Empty;

            var sb = new StringBuilder();
            sb.Append($"Host={uri.Host};");
            if (uri.Port > 0) sb.Append($"Port={uri.Port};");
            sb.Append($"Username='{usuario}';");
            sb.Append($"Password='{senha}';");
            sb.Append($"Database={uri.AbsolutePath.TrimStart('/')};");
            sb.Append("SSL Mode=Require;Trust Server Certificate=true;");
            return sb.ToString();
        }
    }
}
