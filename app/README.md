# Xepa — App (cliente)

Aplicativo mobile em **React Native + Expo** (iOS primeiro, Android depois), consumindo a API em [`../api`](../api).

> Ainda não scaffoldado. A implementação do cliente começa depois que o backend expõe os contratos do Módulo 1.

## Navegação

O app usa **expo-router** (roteamento por arquivos). As rotas ficam em `src/app/`; a UI de cada tela mora em `src/screens/` e as rotas apenas a compõem, mantendo os arquivos de rota finos.

Tabs planejadas, na linguagem do produto:

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
├── app/            # rotas do expo-router
├── screens/        # UI das telas, composta pelas rotas
├── components/
│   ├── common/     # blocos compostos do produto
│   └── ui/         # primitivos do design system
├── contexts/       # sessão, tema
├── hooks/
├── services/api/   # chamadas HTTP à API
├── store/
├── theme/          # brand kit (cores, tipografia, espaçamento)
├── constants/
├── localization/
├── types/
└── utils/
```

## Variáveis de ambiente

Copie `../.env.example` para `.env`. Variáveis expostas ao app precisam do prefixo `EXPO_PUBLIC_`.
