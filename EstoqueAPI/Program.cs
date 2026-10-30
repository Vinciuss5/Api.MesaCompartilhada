using EstoqueAPI.Data;
using EstoqueAPI.Mappings;
using EstoqueAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,  // ← força ler o appsettings.json do mesmo lugar do .exe
    WebRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot")
});

// --- PORTA: em produção (Render) a porta vem da variável PORT; localmente, 5235 ---
var porta = Environment.GetEnvironmentVariable("PORT");
builder.WebHost.UseUrls(string.IsNullOrWhiteSpace(porta)
    ? "http://localhost:5235"
    : $"http://0.0.0.0:{porta}");

// --- 1. CONFIGURAÇÃO DE BANCO E MAPPINGS ---
// Postgres (Render + Neon) quando "Database__Provider=Postgres"; caso contrário SQLite local.
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var usarPostgres = string.Equals(
    builder.Configuration["Database:Provider"], "Postgres", StringComparison.OrdinalIgnoreCase);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (usarPostgres)
        options.UseNpgsql(MigradorDados.NormalizarConnPostgres(connectionString));
    else
        options.UseSqlite(connectionString);
});

// --- MODO ÚNICO: migração de dados SQLite -> Postgres (não sobe o servidor) ---
// Uso: $env:ConnectionStrings__DefaultConnection="postgresql://..." (URL do Neon)
//      dotnet run --project EstoqueAPI -- migrar-dados "<caminho completo>\estoque.db"
if (args.Length > 0 && string.Equals(args[0], "migrar-dados", StringComparison.OrdinalIgnoreCase))
{
    await MigradorDados.ExecutarAsync(args.ElementAtOrDefault(1), connectionString);
    return;
}

builder.Services.AddAutoMapper(cfg => { }, typeof(MappingProfile));

// --- CORS: permite tanto o Vite (dev) quanto o proprio servidor (produção) ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontendApp", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// --- 2. REGISTRO DE SERVIÇOS (DI) ---
builder.Services.AddScoped<IProdutoService, ProdutoService>();
builder.Services.AddScoped<IDoadorService, DoadorService>();
builder.Services.AddScoped<ISolicitanteService, SolicitanteService>();
builder.Services.AddScoped<IDoacaoService, DoacaoService>();
builder.Services.AddScoped<ISolicitacaoService, SolicitacaoService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IEstoqueService, EstoqueService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ILogService, LogService>();
builder.Services.AddScoped<IEmailService, EmailService>();

// --- 3. CONFIGURAÇÃO DE AUTENTICAÇÃO JWT ---
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ChaveSuperSecretaDePeloMenos32Caracteres";
var key = Encoding.ASCII.GetBytes(jwtKey);
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true
    };
});

// --- 4. CONFIGURAÇÃO MINIMALISTA ---
// O filtro grava em "Logs" toda mutação autenticada com sucesso (auditoria)
builder.Services.AddScoped<EstoqueAPI.Filters.AuditoriaActionFilter>();
builder.Services.AddControllers(options =>
    options.Filters.Add<EstoqueAPI.Filters.AuditoriaActionFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Cria/aplica o schema do banco na inicialização (e semeia o usuário admin)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (usarPostgres)
    {
        // No Postgres o schema é gerado direto do modelo.
        // (As migrations versionadas foram geradas para o SQLite.)
        db.Database.EnsureCreated();
    }
    else
    {
        db.Database.Migrate();
    }

    // Ajustes idempotentes que o EnsureCreated não faz em bancos já existentes
    await AjustesEsquema.GarantirAsync(db, usarPostgres);
}

// --- 5. PIPELINE DE MIDDLEWARE ---

// CORS sempre primeiro
app.UseCors("AllowFrontendApp");

// Swagger só em desenvolvimento
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Arquivos estáticos do React (wwwroot)
app.UseDefaultFiles();
app.UseStaticFiles();


app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Fallback para o React Router funcionar
app.Use(async (context, next) =>
{
    await next();

    if (context.Response.StatusCode == 404
        && !context.Request.Path.StartsWithSegments("/api")
        && !Path.HasExtension(context.Request.Path))
    {
        // Usa o WebRootFileProvider (funciona tanto na publicação quanto no modo dev)
        var env = context.RequestServices.GetRequiredService<IWebHostEnvironment>();
        var index = env.WebRootFileProvider.GetFileInfo("index.html");

        if (index.Exists && !string.IsNullOrEmpty(index.PhysicalPath))
        {
            context.Response.StatusCode = 200;
            await context.Response.SendFileAsync(index.PhysicalPath);
        }
        else
        {
            context.Response.StatusCode = 404;
        }
    }
});

app.Run();