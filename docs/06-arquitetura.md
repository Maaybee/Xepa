# Diagrama de Arquitetura — Hub Universitário

App mobile **cross-platform (React Native + Expo)**, iOS primeiro e Android depois, consumindo uma **API REST em camadas** (Controller → Service → Repository) sobre um **banco relacional (PostgreSQL)**, com integrações a sistemas externos.

## Planos da arquitetura

1. **App Mobile (Cliente)** — camada de apresentação (telas dos 5 módulos), com o leitor de QR Code usando a câmera do aparelho e as notificações locais (lembretes de lavanderia, alertas).
2. **API REST em camadas** — Controller (entrada HTTP), Service (regras de negócio) e Repository (acesso a dados), exatamente o padrão dos diagramas de sequência.
3. **Banco de Dados** — relacional (PostgreSQL), materializando o modelo ER validado.

## Integrações externas

- **Serviço de E-mail** — recuperação de senha e notificações.
- **Instituição de Ensino** — importação automática de notas (RF023), apenas com vínculo ativo (RN05).
- **Sistema Bancário** — notificações de movimentação para lançamento automático (RF015). Depende de acesso às notificações do SO: viável no Android, **restrito no iOS (RNF13)**. No lançamento iOS, o financeiro se apoia no registro manual (RF017).

## Código Eraser (Architecture diagram)

```cloud-architecture-diagram
// Arquitetura — Hub Universitário

App Mobile [icon: react] {
  Telas [label: "Telas dos 5 módulos", icon: mobile]
  Scanner [label: "Leitor de QR Code (câmera)", icon: camera]
  Lembretes [label: "Notificações locais", icon: bell]
}

API [label: "API REST em camadas — Node/TypeScript", icon: nodejs] {
  Controller [icon: server]
  Service [icon: server]
  Repository [icon: server]
}

Banco [label: "Banco de Dados — PostgreSQL", icon: postgresql]

SistemaBancario [label: "Sistema Bancário", icon: bank]
Instituicao [label: "Instituição de Ensino", icon: graduation-cap]
Email [label: "Serviço de E-mail", icon: mail]

// Fluxo principal
Telas > Controller: HTTPS / REST
Controller > Service > Repository > Banco

// Integrações externas
Service > Email: envio de e-mails
Service > Instituicao: importar notas (RF023)
SistemaBancario --> Lembretes: notificações (Android; iOS restrito — RNF13)
```
