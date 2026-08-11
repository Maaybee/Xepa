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

## Próximos módulos

Despensa (SD06–SD10), Grana (SD11–SD15), Cabeça (SD16–SD20) e Roupa (SD21–SD24) ainda não foram implementados.
