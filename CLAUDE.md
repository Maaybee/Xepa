# Xepa

## Visão geral
Xepa é um app mobile que unifica, num único hub, a rotina de estudantes universitários morando sozinhos pela primeira vez: controle de despensa, gestão financeira, acompanhamento dos estudos e gestão de lavanderia. O nome vem da gíria de feira ("xepa" = sobras baratas do fim da feira); a identidade gira em torno de aproveitar bem recursos limitados. Ator único: o **Usuário (estudante)**.

## Stack
- **Cliente**: React Native + Expo — iOS primeiro, Android depois
- **Backend**: Node + TypeScript, API REST em camadas
- **Banco**: PostgreSQL
- **Integrações externas**: Sistema Bancário (notificações), Instituição de Ensino (importação de notas), Serviço de E-mail

## Arquitetura
API REST em camadas: **Cliente → Controller → Service → Repository → Banco de Dados**. O leitor de QR Code e as notificações locais rodam no próprio app. Detalhe em `docs/06-arquitetura.md`.

## Módulos (linguagem do produto)
- **Conta / Autenticação**
- **Despensa** — controle de estoque
- **Grana** — financeiro
- **Cabeça** — estudos
- **Roupa** — lavanderia

Home = "a banca"; resumo mensal = "a sacola". Identidade visual no brand kit (olive profundo como cor primária; fontes Anton, Permanent Marker e Instrument Sans).

## Decisões e restrições-chave
- **iOS primeiro + notificações bancárias**: a leitura automática de movimentação (RF015) é restrita no iOS (RNF13). No lançamento iOS a automação bancária não funciona — o financeiro se apoia no **registro manual (RF017)**; a automação entra com o Android.
- **QR Code só para notas de mercado (RN18)**: toda transação gerada por nota nasce categorizada como "Mercado". Simplifica a categorização.
- **Orçamento por categoria, não teto único (RF020, RN17)**: o usuário define um limite por categoria/mês (ex.: R$ 300 mercado, R$ 200 lazer); no máximo um orçamento por categoria por mês.
- **Alerta de estoque configurável por item (RF012, RN08)**: o usuário escolhe quais itens monitorar e a quantidade mínima de cada.
- **Nota → 1 transação (evita dupla contagem)**: uma nota processada gera exatamente uma `TRANSACAO` (origem="nota"); a relação `NOTA_FISCAL`–`TRANSACAO` é 1:1. O gasto do mês (RN11) sai só de `TRANSACAO`.
- **Desnormalização intencional**: `PRODUTO.quantidade_atual` e `PECA_ROUPA.usos_atuais` são deriváveis (de `MOVIMENTACAO_ESTOQUE` e `USO_PECA`), mas mantidos como coluna para leitura rápida — precisam ser atualizados a cada movimentação.
- **Duas "categorias" distintas**: `PRODUTO.categoria` é texto livre (despensa); `CATEGORIA` é entidade (financeira). Não confundir.
- **Sabão e amaciante são `PRODUTO`** como os demais (RN13); o alerta de lavanderia (RF033) consulta o estoque.
- **Importação de notas**: depende de vínculo institucional ativo (RN05) e de a instituição expor integração (a maioria não expõe) — a **entrada manual (RF024) é o caminho principal**.
- **Escopo completo modelado** — o passo de MVP foi pulado de propósito.
- **Valores definidos**: senha ≥ 8 com maiúscula, número e especial (RN02); sessão expira em 30 min (RNF09); QR ≤ 5 s (RNF04); disponibilidade 99% (RNF10); Android 10+ / iOS 15+ (RNF12); alerta de orçamento em 80% (RN12).

## Convenções
- Backend em camadas: Controller (entrada HTTP) → Service (regras de negócio) → Repository (acesso a dados).
- Diagramas: ER e sequência na **DSL do Eraser**; casos de uso em **Mermaid**.
- Documentação no padrão **WAD** (Web Application Document).

## Estrutura do repositório
```
xepa/
├── CLAUDE.md
├── README.md
├── docs/                     # modelagem completa (ver seção Documentação)
├── app/                      # React Native + Expo (cliente) — ainda não scaffoldado
│   └── src/
│       ├── app/              # rotas do expo-router
│       ├── screens/          # banca, despensa, grana, cabeca, roupa
│       ├── components/
│       ├── services/api/     # chamadas à API
│       ├── theme/            # brand kit
│       ├── contexts/  hooks/  store/  types/  utils/  constants/  localization/
└── api/                      # Node + TypeScript (backend em camadas)
    └── src/
        ├── controllers/      # entrada HTTP + validação de formato (Zod)
        ├── services/         # regras de negócio (as RNs)
        ├── repositories/     # único lugar com SQL
        ├── models/           # tipos das entidades do ER
        ├── routes/
        ├── middlewares/      # autenticar, errorHandler, asyncHandler
        ├── config/           # env tipado
        ├── utils/            # errors, senha, token
        └── db/               # pool, migrations (DDL), seeds, runners
```

O cliente usa **expo-router**: as rotas ficam em `app/src/app/` e a UI das telas em `app/src/screens/`.

## Documentação
- Visão geral: `docs/01-visao-geral.md`
- Requisitos (RF/RN/RNF): `docs/02-requisitos.md`
- Casos de uso: `docs/03-casos-de-uso.md`
- Modelo de dados (ER): `docs/04-modelo-de-dados.md`
- Diagramas de sequência (24): `docs/05-diagramas-sequencia.md`
- Arquitetura: `docs/06-arquitetura.md`
- Contrato da API (rotas implementadas): `docs/07-api.md`
- Documento consolidado: `docs/documentacao-completa.md`

## Convenções da API

- Controller nunca chama Repository direto; Service nunca escreve SQL.
- Validação de **formato** fica no Controller (schemas Zod); validação de **regra de negócio** fica no Service.
- Erros de domínio: o Service lança `AppError` (`api/src/utils/errors.ts`) e o `errorHandler` traduz para HTTP. Os Services não importam Express.
- Todo handler assíncrono de rota vai embrulhado em `asyncHandler` (o Express 4 não encaminha rejeição de Promise).
- Toda constraint de banco criada por causa de uma regra cita a RN no comentário do DDL.

## Estado atual e próximos passos

**Pronto**
- Modelagem: requisitos (RF001–RF033, RN01–RN18, RNF01–RNF16), casos de uso (19), modelo de dados (18 entidades), 24 diagramas de sequência, arquitetura, brand kit.
- Banco: DDL das 18 entidades com as constraints das RNs, runner de migrations e seeds (avatares, instituições).
- API: **completa** — scaffold em camadas e os cinco módulos, cobrindo os 24 diagramas de sequência. Conta/Autenticação (SD01–SD05), Despensa (SD06–SD10), Grana (SD11–SD15), Cabeça (SD16–SD20) e Roupa (SD21–SD24).

**A fazer**
- Suíte de testes automatizados da API (hoje a verificação é manual, contra um Postgres real).
- Cliente: scaffold Expo + expo-router, tema a partir do brand kit, telas dos 5 módulos.
- Personas e user stories; wireframes/UX.
