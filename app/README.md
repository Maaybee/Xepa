# Xepa — App (cliente)

Aplicativo mobile em **React Native + Expo** (SDK 57, iOS primeiro), consumindo a API em [`../api`](../api).

## Rodando

Pré-requisito: a API no ar (`cd ../api && npm run dev`).

```bash
cd app
npm install
cp .env.example .env      # ajuste EXPO_PUBLIC_API_URL
npm start                 # abre o Expo; tecle `i` para o simulador do iOS
```

O endereço da API depende de onde o app roda:

| Onde | `EXPO_PUBLIC_API_URL` |
|------|----------------------|
| Simulador do iOS | `http://localhost:3333/api` |
| Emulador do Android | `http://10.0.2.2:3333/api` — no emulador, `localhost` é o próprio dispositivo |
| Aparelho físico | `http://<IP-da-máquina>:3333/api` |

Sem Postgres instalado, suba a API com `cd ../api && npm run dev:memoria` e popule com `npm run demo:semear` — aí é só entrar com `demo@xepa.app` / `Xepa#2026`.

| Script | O que faz |
|--------|-----------|
| `npm start` | sobe o Metro |
| `npm run ios` / `npm run android` | sobe já abrindo o simulador |
| `npm run typecheck` | checagem de tipos sem emitir |

## Navegação

**expo-router** (roteamento por arquivos), com as rotas em `src/app/` — o Metro reconhece `src/app` sozinho. A UI de cada tela mora em `src/screens/`; os arquivos de rota só reexportam a tela, ficando de uma linha.

Dois grupos, separados por sessão:

| Grupo | Rotas | Guarda |
|-------|-------|--------|
| `(auth)` | `/entrar`, `/cadastro`, `/recuperar-senha` | redireciona para `/` quem já tem sessão |
| `(banca)` | `/`, `/despensa`, `/grana`, `/cabeca`, `/roupa` | redireciona para `/entrar` quem não tem |

Fora dos grupos, `/perfil` abre como modal (SD05 e logout).

| Rota | Módulo |
|------|--------|
| `/` | a banca (home) |
| `/despensa` | Despensa — estoque |
| `/grana` | Grana — financeiro |
| `/cabeca` | Cabeça — estudos |
| `/roupa` | Roupa — lavanderia |

## Estrutura

```
src/
├── app/            # rotas do expo-router (finas: só reexportam a tela)
├── screens/        # UI das telas
├── components/
│   ├── common/     # molduras e blocos do produto (TelaModulo, TelaAuth, Secao)
│   └── ui/         # primitivos (Texto, Botao, Campo, Cartao, Selo, Aviso, Barra)
├── contexts/       # SessaoContext
├── hooks/          # useRequisicao (carregar), useAcao (mutar)
├── services/api/   # cliente HTTP + um módulo por módulo da API
├── theme/          # brand kit (cores, tipografia, espaçamento)
├── types/          # contratos da API
└── utils/          # formatação pt-BR, espelho da RN02
```

## Como o app conversa com a API

- `services/api/cliente.ts` é o único lugar que monta requisição. Os módulos (`conta`, `despensa`, `grana`, `cabeca`, `roupa`) só descrevem caminho e corpo.
- O token da sessão fica no **SecureStore** (Keychain no iOS) — é o cuidado equivalente, no cliente, ao do backend guardar só o hash (RNF07).
- Todo **401** derruba a sessão local e o app volta para o login. É como a expiração por inatividade (RNF09) aparece na prática.
- As mensagens de erro vêm prontas do backend, em português, e são mostradas direto. O app **não recalcula regra de negócio**: alerta de reposição (RN08), de orçamento (RN12) e de lavagem (RN14) chegam na resposta da própria ação. A única exceção é a força da senha (RN02), espelhada em `utils/senha.ts` só para dar retorno enquanto o usuário digita — quem decide continua sendo a API.

## Tema

`src/theme/` materializa o brand kit descrito em [`../docs/01-visao-geral.md`](../docs/01-visao-geral.md): base off-white (papel), tinta quase preta, olive profundo como única primária e um tom dessaturado por módulo, usado só como acento — fita lateral de cartão, ícone, selo. Área grande é sempre papel.

Tipografia via `@expo-google-fonts`: **Anton** nos títulos (caixa alta), **Permanent Marker** nas chamadas (a voz de feira) e **Instrument Sans** no texto corrido.

## Variáveis de ambiente

`.env` na raiz de `app/`. Variáveis expostas ao app precisam do prefixo `EXPO_PUBLIC_`.
