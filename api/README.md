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

### Sem Postgres instalado

Para desenvolver o app sem montar um Postgres, existe um modo com o banco embutido:

```bash
npm run dev:memoria       # sobe a API sobre PGlite, grava em api/.pglite/
npm run demo:semear       # popula uma conta de demonstração
```

`scripts/gancho-banco.mjs` é um gancho de resolução de módulos que troca `src/db/pool.ts` por uma implementação sobre [PGlite](https://pglite.dev) — o mesmo Postgres-em-WASM da suíte de testes. **Nada em `src/` sabe disso**: Controllers, Services e Repositories continuam importando `../db/pool.js`. As migrations rodam sozinhas na primeira subida e os dados sobrevivem a reinícios.

Não substitui Postgres em produção — `npm run dev` continua falando com um servidor de verdade.

O seed cria `demo@xepa.app` / `Xepa#2026` com os dados já nas condições que disparam os alertas: item no limite (RN08), orçamento em 92,5% (RN12), sabão zerado (RN13) e peça no limite de usos (RN14).

## Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | sobe a API com recarga automática (exige Postgres) |
| `npm run dev:memoria` | sobe a API sobre PGlite, sem Postgres instalado |
| `npm run demo:semear` | popula a conta de demonstração (com a API no ar) |
| `npm run build` / `npm start` | compila para `dist/` e executa |
| `npm run typecheck` | checagem de tipos sem emitir |
| `npm run typecheck:test` | o mesmo, incluindo `test/` |
| `npm test` | suíte completa (unidade + integração) |
| `npm run test:unidade` / `npm run test:integracao` | roda só uma das partes |
| `npm run db:migrate` | aplica as migrations pendentes (`--reset` derruba e recria o schema) |
| `npm run db:seed` | popula avatares, instituições e categorias padrão |
| `npm run db:reset` | `db:migrate --reset` seguido de `db:seed` |

## Testes

`npm test` — **não precisa de banco nenhum instalado**, nem de `.env`.

| Pasta | O que cobre |
|-------|-------------|
| `test/unidade/` | funções puras: força da senha (RN02), tokens (RNF07), médias e progressão (RN15, RN16), alerta de estoque (RN08), orçamento (RN12), limite de usos (RN14) |
| `test/integracao/` | um arquivo por módulo, atravessando rota → middleware → controller → service → repository → banco |
| `test/apoio/` | banco de teste, cliente HTTP e a conta pronta usada pelos cenários |

Os testes de integração sobem o app Express de verdade numa porta efêmera e conversam com ele por `fetch`. O banco é um [PGlite](https://pglite.dev) — o próprio Postgres compilado para WASM, em memória — colocado no lugar de `src/db/pool.ts` por `test/apoio/banco.ts`. O DDL de `src/db/migrations/` roda inteiro, então as constraints que materializam as RNs valem no teste como valem em produção.

Como escrever mais:

- O nome do teste cita a RN ou o RF que ele defende — é o que liga a suíte a `docs/02-requisitos.md`.
- `test/apoio/banco.js` precisa ser importado **antes** de qualquer módulo de `src/`; por isso os arquivos de integração chamam `await prepararBanco()` no topo e o app entra por importação dinâmica.
- Cada cenário começa com o banco limpo (`banco.limpar()` no `beforeEach`); avatares e instituições, que são dados de apoio, permanecem.
- `criarConta()` cria usuário e sessão direto pelo Repository, pulando o bcrypt de 12 rounds. O cadastro e o login reais são exercitados em `test/integracao/conta.test.ts`.
