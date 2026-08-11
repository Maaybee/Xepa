# Xepa — API

API REST em camadas (**Controller → Service → Repository → PostgreSQL**), em Node + TypeScript, seguindo os diagramas de sequência de [`../docs/05-diagramas-sequencia.md`](../docs/05-diagramas-sequencia.md).

## Camadas

| Camada | Pasta | Responsabilidade |
|--------|-------|------------------|
| Controller | `src/controllers/` | entrada HTTP: lê a requisição, chama o Service, monta o status/corpo da resposta |
| Service | `src/services/` | regras de negócio (as RNs). Não conhece Express nem SQL |
| Repository | `src/repositories/` | acesso a dados: só aqui existe SQL |
| Rotas | `src/routes/` | mapeia caminho + método para o Controller |
| Modelos | `src/models/` | tipos das entidades do ER |

Regras que valem para o código todo:

- Controller nunca fala com Repository direto, e Service nunca escreve SQL.
- Erros de domínio são lançados pelo Service via `AppError` (`src/utils/errors.ts`); o `errorHandler` traduz em HTTP. Nenhum `res.status(...)` de erro espalhado pelos Services.
- Validação de formato fica no Controller (schemas Zod); validação de regra de negócio fica no Service.

## Setup

Pré-requisito: Node 20+ e um PostgreSQL 14+ acessível.

```bash
cd api
npm install
cp .env.example .env      # ajuste DATABASE_URL
npm run db:reset          # cria o schema e popula os dados de apoio
npm run dev               # http://localhost:3333/api
```

Checagem rápida: `GET /api/saude` responde `{ "status": "ok", "banco": "ok" }`.

## Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | sobe a API com recarga automática |
| `npm run build` / `npm start` | compila para `dist/` e executa |
| `npm run typecheck` | checagem de tipos sem emitir |
| `npm run db:migrate` | aplica as migrations pendentes (`--reset` derruba e recria o schema) |
| `npm run db:seed` | popula avatares, instituições e categorias padrão |
| `npm run db:reset` | `db:migrate --reset` seguido de `db:seed` |
