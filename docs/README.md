# Documentação — Xepa

| Arquivo | Conteúdo |
|---------|----------|
| [`01-visao-geral.md`](./01-visao-geral.md) | problema, proposta, ator e módulos |
| [`02-requisitos.md`](./02-requisitos.md) | RF001–RF033, RN01–RN18, RNF01–RNF16 |
| [`03-casos-de-uso.md`](./03-casos-de-uso.md) | 19 casos de uso + diagrama (Mermaid) |
| [`04-modelo-de-dados.md`](./04-modelo-de-dados.md) | modelo ER, 18 entidades (DSL do Eraser) |
| [`05-diagramas-sequencia.md`](./05-diagramas-sequencia.md) | 24 diagramas de sequência (DSL do Eraser) |
| [`06-arquitetura.md`](./06-arquitetura.md) | camadas e integrações externas |
| [`07-api.md`](./07-api.md) | contrato das rotas já implementadas |
| [`documentacao-completa.md`](./documentacao-completa.md) | consolidado, no padrão WAD |

O DDL vive junto do código, em [`../api/src/db/migrations/`](../api/src/db/migrations); cada constraint criada por causa de uma regra de negócio cita a RN correspondente.
