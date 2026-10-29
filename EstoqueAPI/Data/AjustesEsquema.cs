using Microsoft.EntityFrameworkCore;

namespace EstoqueAPI.Data
{
    /// <summary>
    /// Ajustes de schema idempotentes para o Postgres (Render + Neon).
    /// No Postgres usamos EnsureCreated(), que NÃO altera tabelas já existentes.
    /// Estes comandos seguros (podem rodar a cada inicialização) aplicam as
    /// mudanças de modelo que o EnsureCreated sozinho não faz.
    /// No SQLite local, as migrations do EF cuidam de tudo (Migrate()).
    /// </summary>
    public static class AjustesEsquema
    {
        public static async Task GarantirAsync(AppDbContext db, bool usarPostgres)
        {
            if (!usarPostgres) return; // SQLite: migrations do EF resolvem

            string[] comandos =
            {
                // Cadastro de funcionários simplificado: CPF deixou de ser obrigatório
                @"ALTER TABLE ""Usuarios"" ALTER COLUMN ""CPF"" DROP NOT NULL;",

                // Solicitante: CPF deixou de ser obrigatório (empresas usam CNPJ)
                @"ALTER TABLE ""Solicitantes"" ALTER COLUMN ""CPF"" DROP NOT NULL;",

                // Nova coluna de pessoa jurídica (empresas) — IF NOT EXISTS = pode rodar sempre
                @"ALTER TABLE ""Solicitantes"" ADD COLUMN IF NOT EXISTS ""CNPJ"" character varying(14);",

                // Índice único de CNPJ (NULLs não conflitam no Postgres)
                @"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Solicitantes_CNPJ"" ON ""Solicitantes"" (""CNPJ"");"
            };

            foreach (var sql in comandos)
                await db.Database.ExecuteSqlRawAsync(sql);
        }
    }
}
