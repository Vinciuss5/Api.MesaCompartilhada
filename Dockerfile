# =========================================================
# 1) Frontend React (Vite) — gera o dist/ que a API serve
# =========================================================
FROM node:24-alpine AS frontend
WORKDIR /app
COPY sistema-ong-frontend/package.json sistema-ong-frontend/package-lock.json ./
RUN npm ci
COPY sistema-ong-frontend/ ./
RUN npm run build

# =========================================================
# 2) API .NET — publica com o wwwroot atualizado do front
# =========================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY EstoqueAPI/EstoqueAPI.csproj EstoqueAPI/
RUN dotnet restore EstoqueAPI/EstoqueAPI.csproj
COPY EstoqueAPI/ EstoqueAPI/
# Substitui o wwwroot (build antigo) pelo build atual do frontend
RUN rm -rf EstoqueAPI/wwwroot && mkdir -p EstoqueAPI/wwwroot
COPY --from=frontend /app/dist/ EstoqueAPI/wwwroot/
RUN dotnet publish EstoqueAPI/EstoqueAPI.csproj -c Release -o /app/publish --no-restore

# =========================================================
# 3) Imagem final (somente runtime)
# =========================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Production
# O Program.cs usa a variável PORT (padrão do Render: 10000)
EXPOSE 10000
ENTRYPOINT ["dotnet", "EstoqueAPI.dll"]
