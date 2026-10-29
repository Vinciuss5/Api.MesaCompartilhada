# 🚀 Guia de Deploy — Mesa Compartilhada (grátis, sem cartão de crédito)

O sistema sobe como **um único site** na nuvem:

| Peça | Onde roda | Custo |
|---|---|---|
| Site + API (Docker/.NET 10 + React) | **Render.com** (Web Service, plano Free) | $0 |
| Banco de dados (PostgreSQL) | **Neon** (plano Free, permanente) | $0 |

> Por que não usar o SQLite na nuvem? O plano grátis do Render **apaga o disco local**
> quando o site dorme (15 min sem acesso). O Postgres do Neon fica salvo fora do
> Render — os dados sobrevivem ao dormir, reiniciar e até a novos deploys.

---

## Passo 1 — Código no GitHub ✅ (feito)

O código já está publicado em: <https://github.com/Vinciuss5/Api.MesaCompartilhada>
(branch `main`). O `.gitignore` deixa de fora: `node_modules`, `bin/obj`, os
arquivos `.db` (banco local) e a pasta publicada com o `.exe`.

Para atualizar o site no futuro:

```powershell
git add .
git commit -m "descricao da mudanca"
git push
```

O Render detecta o push e faz o deploy sozinho.

---

## Passo 2 — Criar o banco grátis no Neon (sem cartão)

1. Acesse <https://neon.tech/signup> e cadastre-se (dá pra usar a conta do GitHub). **Não pede cartão.**
2. Clique em **Create project** — nome: `mesa-compartilhada`.
3. Na página do projeto, clique no botão **Connect** e copie a **pooled connection string**
   (a que contém `-pooler` e termina com `?sslmode=require`).
   Ela se parece com:
   `postgresql://neondb_owner:npg_XXXX@ep-xxx-yyy-pooler.aws.neon.tech/neondb?sslmode=require`

> Guarde esse texto — você vai colar no Render no próximo passo.
> O plano Free do Neon guarda **1 GB** de dados e **não expira**.

---

## Passo 3 — Publicar no Render

1. Acesse <https://dashboard.render.com/register> e cadastre-se **com o GitHub** (mesma conta do repositório).
2. No Dashboard: **New → Web Service**.
3. Aba **Git** → conecte o GitHub → escolha o repositório criado no Passo 1 → **Connect**.
4. Preencha:

| Campo | Valor |
|---|---|
| Name | `mesa-compartilhada` |
| Region | **Virginia** (mais perto do Brasil) |
| Branch | `main` |
| Runtime | **Docker** (o Render usa o `Dockerfile` da raiz) |
| Plan | **Free** |

5. Em **Advanced → Environment Variables**, adicione exatamente:

| Chave | Valor |
|---|---|
| `Database__Provider` | `Postgres` |
| `ConnectionStrings__DefaultConnection` | a URL do Neon copiada no Passo 2 |

6. Clique em **Create Web Service**. O primeiro build leva alguns minutos
   (instala o Node, monta o React, compila o .NET e cria a imagem Docker).

7. Quando terminar, abra o site: `https://SEU-SERVIDOR.onrender.com`

---

## Passo 4 — Entrar no sistema

- **E-mail:** `admin@mesa.com`
- **Senha:** a mesma senha de sempre (é o mesmo hash do banco local).
- Se não lembrar a senha, é só avisar — gero um novo hash em 1 minuto.

---

## Como atualizar o site depois

Faça alterações, commit e push:

```powershell
git add .
git commit -m "descricao da mudanca"
git push
```

O Render detecta o push e **faz o deploy sozinho**. O banco não é afetado.

---

## Migração dos dados antigos (opcional)

Os dois arquivos `estoque.db` locais estão praticamente vazios (apenas o usuário
admin), então **não há nada urgente a migrar**. Se no futuro você registrar dados
localmente antes de publicar, copie tudo para o Postgres com:

```powershell
$env:ConnectionStrings__DefaultConnection = "postgresql://... (URL do Neon)"
dotnet run --project EstoqueAPI -- migrar-dados "C:\Users\vinic\OneDrive\Área de Trabalho\SISTEMA-ONG-MESA-COMPARTILHADA-V3.0\EstoqueAPI\estoque.db"
```

A ferramenta cria as tabelas no Neon se necessário, copia registro por registro
(respeitando chaves estrangeiras), **pula o que já existe** e ajusta a sequência
de IDs. Pode rodar mais de uma vez.

---

## O que mudou no código (feito automaticamente)

- **`Program.cs`** — porta agora vem da variável `PORT` (Render); banco comuta
  entre SQLite (local) e Postgres (nuvem) via `Database__Provider`; no Postgres
  usa `EnsureCreated()` (as migrations antigas eram do SQLite).
- **`appsettings.json`** — removido o `Kestrel` fixo em `localhost:5235`.
- **Frontend** — login e chamadas da API agora usam `VITE_API_URL=/api`
  (relativo: mesmo domínio, sem CORS e sem `localhost` em produção).
- **`Dockerfile`** — builda o React e a API numa imagem só; o `wwwroot` sempre
  recebe o build atualizado do frontend (antes ficava desatualizado).
- **`MigradorDados.cs`** — ferramenta `migrar-dados` (acima).
- **`.gitignore` / `.dockerignore`** — evita subir banco, `node_modules`, `bin/obj`.

---

## Limitações do plano grátis (para saber)

- **Repouso:** sem acesso por 15 min o site "dorme"; o primeiro visitante espera
  ~1 minuto para ele acordar (depois fica rápido).
- **750 horas/mês** de máquina — suficiente para um site que dorme sozinho.
- O Neon Free guarda 1 GB e não expira (pausa o processamento após 5 min parado,
  acorda sozinho na primeira consulta).

## Desenvolvimento local (não mudou)

```powershell
# Terminal 1 — API (usa o SQLite local, porta 5235)
dotnet run --project EstoqueAPI

# Terminal 2 — Frontend com recarga automática (porta 5173)
cd sistema-ong-frontend
npm run dev
```

Ou continue usando o `Iniciar Mesa Compartilhada.bat` (publicação local).
