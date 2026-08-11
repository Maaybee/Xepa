# Contrato da API

Base: `/api`. Corpo e resposta em JSON. Rastreabilidade aos diagramas de sequência em [`05-diagramas-sequencia.md`](./05-diagramas-sequencia.md).

## Erros

Todo erro sai no mesmo formato:

```json
{ "erro": { "codigo": "BAD_REQUEST", "mensagem": "…", "detalhes": [] } }
```

| Status | Código | Quando |
|--------|--------|--------|
| 400 | `BAD_REQUEST` | corpo inválido, senha fora da RN02, avatar/instituição inexistente, link de redefinição inválido |
| 401 | `UNAUTHORIZED` | credenciais erradas, sem token, token inválido ou sessão expirada |
| 404 | `NOT_FOUND` | rota inexistente |
| 409 | `CONFLICT` | e-mail já cadastrado (RN01) |
| 500 | `INTERNAL_ERROR` | falha não prevista |

## Sessão

Rotas protegidas exigem `Authorization: Bearer <token>`. O token vem do login e é um valor opaco de 256 bits — o banco guarda apenas o SHA-256 dele.

**RNF09**: a sessão expira com 30 minutos de inatividade, e cada requisição autenticada reinicia a contagem. O logout invalida o token na hora (RN03).

---

## Saúde

### `GET /api/saude`
Verifica a API e a conexão com o banco. → `200 { "status": "ok", "banco": "ok" }`

---

## Módulo 1 — Conta / Autenticação

O objeto `usuario` devolvido por estas rotas é sempre a projeção pública — nunca inclui hash, salt ou tokens:

```json
{
  "id": 1,
  "nome": "Ana",
  "email": "ana@exemplo.com",
  "avatar": { "id": 3, "descricao": "Sacola", "url": "avatares/sacola.png" },
  "instituicao": { "id": 1, "nome": "Instituto Federal de São Paulo (IFSP)" },
  "criadoEm": "2026-08-10T12:00:00.000Z"
}
```

### `POST /api/conta/cadastro` — SD01 (RF001, RN01, RN02, RNF06)

Corpo: `{ "nome": string, "email": string, "senha": string }`

A senha precisa cumprir a RN02: mínimo 8 caracteres, com maiúscula, número e caractere especial. O e-mail é normalizado para minúsculas.

- `201` → `{ "usuario": … }`
- `400` senha fora da RN02 — `detalhes.requisitos` lista o que falta
- `409` e-mail já cadastrado (RN01)

A conta nasce com as categorias financeiras padrão (Mercado, Moradia, Transporte, Lazer, Saúde, Educação, Outros). "Mercado" é obrigatória pela RN18.

### `POST /api/conta/login` — SD02 (RF002, RNF09)

Corpo: `{ "email": string, "senha": string }`

- `200` → `{ "token": string, "expiraEm": ISO8601, "usuario": … }`
- `401` e-mail ou senha incorretos

A resposta é idêntica para e-mail inexistente e senha errada, de propósito: não dá para descobrir quais e-mails têm conta.

### `POST /api/conta/logout` — SD03 (RF003, RN03) 🔒

- `200` → `{ "mensagem": "Sessão encerrada." }`
- `401` token ausente, inválido ou já expirado

### `POST /api/conta/recuperar-senha` — SD04 (RF005)

Corpo: `{ "email": string }`

Sempre `200`, com a mesma mensagem genérica, exista o e-mail ou não. Se existir, um link com token de validade limitada é enviado por e-mail.

### `POST /api/conta/redefinir-senha` — SD04

Corpo: `{ "token": string, "senha": string }`

- `200` → senha trocada; o token é consumido e a sessão ativa é derrubada
- `400` token inválido/expirado, ou senha fora da RN02

### `GET /api/conta/perfil` 🔒

- `200` → `{ "usuario": … }`

### `PUT /api/conta/perfil` — SD05 (RF004, RF006, RF007, RN04, RN05) 🔒

Corpo (ao menos um campo): `{ "nome"?: string, "avatarId"?: number|null, "instituicaoId"?: number|null }`

Campo ausente não é alterado; `null` desfaz o vínculo.

- `200` → `{ "usuario": … }`
- `400` corpo vazio, nome em branco, avatar fora da lista (RN04) ou instituição inexistente (RN05)

### `GET /api/conta/avatares` — RF007 / RN04

- `200` → `{ "avatares": [{ "id", "descricao", "url" }] }`

### `GET /api/conta/instituicoes` — RF006 / RN05

- `200` → `{ "instituicoes": [{ "id", "nome" }] }`

---

## Módulo 2 — Despensa

Todas as rotas exigem sessão e são escopadas pelo usuário: produto de outro usuário responde `404`, nunca `403` — não dá para sondar o que existe na despensa alheia.

O objeto `produto`:

```json
{
  "id": 7,
  "nome": "Arroz",
  "categoria": "Grãos",
  "unidade": "kg",
  "quantidadeAtual": 3,
  "monitorado": true,
  "quantidadeMinima": 2,
  "emAlerta": false,
  "criadoEm": "2026-08-10T12:00:00.000Z"
}
```

`emAlerta` é a RN08 avaliada: item monitorado cuja quantidade atingiu ou ficou abaixo da mínima.

### `GET /api/despensa/produtos` — SD09 (RF011)

- `200` → `{ "produtos": [ … ] }`, em ordem alfabética

### `GET /api/despensa/produtos/:id` — SD09 (RF013)

Detalhe com histórico de compras e últimas movimentações.

- `200` → `{ "produto": { …, "historicoCompras": [ { "data", "localCompra", "descricaoNota", "quantidade", "valorUnitario", "valorTotal" } ], "movimentacoes": [ { "tipo", "quantidade", "data" } ] } }`
- `404` produto inexistente ou de outro usuário

### `POST /api/despensa/produtos` — SD07 (RF009)

Corpo: `{ "nome": string, "categoria"?: string|null, "unidade"?: string, "quantidadeInicial"?: number, "monitorado"?: boolean, "quantidadeMinima"?: number|null }`

`quantidadeInicial` entra como movimentação de entrada, não como valor solto — a coluna desnormalizada nasce coerente com o histórico.

- `201` → `{ "produto": … }`
- `400` nome em branco, quantidade negativa, ou `monitorado: true` sem mínima (RN08)
- `409` já existe item com esse nome na despensa

### `PUT /api/despensa/produtos/:id` — SD07 (RF009)

Corpo (ao menos um campo): `nome`, `categoria`, `unidade`, `monitorado`, `quantidadeMinima`.

`quantidadeAtual` **não** é editável aqui de propósito: estoque só muda por movimentação (consumo ou nota).

- `200` / `400` / `404` / `409` — mesma semântica da criação

### `POST /api/despensa/produtos/:id/consumo` — SD08 (RF010, RN07, RN08)

Corpo: `{ "quantidade": number }` (maior que zero)

- `200` → `{ "produto": …, "alertaReposicao": { "mensagem": string } | null }`
- `404` produto inexistente ou de outro usuário
- `422` estoque insuficiente (RN07) — zerar é permitido, ficar negativo não

`alertaReposicao` vem preenchido quando a baixa fez um item monitorado atingir a mínima (RN08).

### `PUT /api/despensa/produtos/:id/monitoramento` — SD10 (RF012)

Corpo: `{ "monitorado": boolean, "quantidadeMinima"?: number|null }`

Desligar o monitoramento limpa a mínima — ela não significa nada sozinha.

- `200` → `{ "produto": … }`
- `400` ligar o monitoramento sem informar a mínima (RN08)

### `GET /api/despensa/alertas` — RF012 / RN08

O que precisa de reposição agora. É também o que o alerta de lavanderia (RF033) vai consultar, já que sabão e amaciante são produtos como os demais (RN13).

- `200` → `{ "produtos": [ … ] }`

### `POST /api/despensa/notas` — SD06 (RF008, RF016, RN06, RN18)

Corpo:

```json
{
  "chaveAcesso": "44 dígitos",
  "localCompra": "Mercado do Zé",
  "dataCompra": "2026-08-01",
  "valorTotal": 68.5,
  "itens": [{ "descricao": "Arroz", "quantidade": 5, "valorUnitario": 6.5 }]
}
```

Tudo acontece numa transação só: grava a nota e os itens, concilia cada item com a despensa (item desconhecido vira produto novo), registra as entradas de estoque, gera **uma** transação financeira e marca a nota como processada.

`valorTotal` é opcional; sem ele, vale a soma dos itens.

- `201` → `{ "notaFiscalId", "transacaoId", "gasto", "itens": [ { "descricao", "quantidade", "produto" } ], "alertasResolvidos": [ "nome do item que saiu do alerta" ] }`
- `400` chave fora do formato, data fora de `AAAA-MM-DD`, nota sem itens
- `409` nota já lida (RN06) — vale globalmente, não por usuário

A transação nasce com `origem: "nota"` e categoria **Mercado** (RN18), e a relação nota↔transação é 1:1 — é o que impede a compra de ser contada duas vezes no gasto do mês (RN11).

### `GET /api/despensa/notas`

- `200` → `{ "notas": [ { "id", "chaveAcesso", "localCompra", "dataCompra", "valorTotal", "processada" } ] }`

---

## Próximos módulos

Grana (SD11–SD15), Cabeça (SD16–SD20) e Roupa (SD21–SD24) ainda não foram implementados.
