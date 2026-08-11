# Xepa

Hub de vida universitária para estudantes morando sozinhos pela primeira vez — despensa, finanças, estudos e lavanderia num só app.

- **Cliente**: React Native + Expo (iOS primeiro, Android depois)
- **Backend**: Node + TypeScript (API REST em camadas)
- **Banco**: PostgreSQL

## Documentação

Toda a modelagem está em [`docs/`](./docs). Comece pela [documentação consolidada](./docs/documentacao-completa.md) ou pelo [`CLAUDE.md`](./CLAUDE.md), que resume o projeto e aponta os detalhes.

## Estrutura

```
app/   → aplicativo mobile (cliente) — ver app/README.md
api/   → backend em camadas (Controller → Service → Repository) — ver api/README.md
docs/  → requisitos, casos de uso, ER, sequência e arquitetura
```

## Estado

| Parte | Situação |
|-------|----------|
| Modelagem completa | pronta |
| Banco (DDL das 18 entidades + seeds) | pronto |
| API — Módulo 1, Conta/Autenticação | pronto |
| API — Módulo 2, Despensa | pronto |
| API — Módulo 3, Grana | pronto |
| API — Módulo 4, Cabeça | pronto |
| API — Módulo 5, Roupa | pronto |
| Testes automatizados da API | pronto (210 testes, `cd api && npm test`) |
| App mobile | a fazer |

## Setup

Pré-requisito: Node 20+ e PostgreSQL 14+.

```bash
cd api
npm install
cp .env.example .env      # ajuste DATABASE_URL
npm run db:reset          # cria o schema e popula os dados de apoio
npm run dev               # http://localhost:3333/api
```

Detalhes de scripts e camadas em [`api/README.md`](./api/README.md).
