# Frontend — Assistente de Curadoria do Catálogo

Interface React (Vite + Express) do assistente editorial.

## Execução

Consulte o [README principal](../README.md) na raiz do repositório para instruções completas de setup com Docker Compose.

### Desenvolvimento local

```bash
npm install
npm run dev
```

O servidor sobe em `http://localhost:3000` e faz proxy das requisições para o backend FastAPI (`BACKEND_URL`, padrão `http://localhost:8000`).
