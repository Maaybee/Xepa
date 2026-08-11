# Casos de Uso

19 casos de uso agrupados por módulo. Um caso de uso representa um objetivo do usuário e agrupa requisitos funcionais relacionados (por isso não é 1:1 com os RFs).

**Ator principal:** Usuário (Estudante). **Atores secundários:** Instituição de Ensino, Sistema Bancário, Serviço de E-mail.

## Lista (com rastreabilidade aos RFs)

**Módulo 1 — Conta**
- UC01 Cadastrar-se — RF001
- UC02 Autenticar (login/logout) — RF002, RF003
- UC03 Gerenciar perfil (dados, avatar, vínculo institucional) — RF004, RF006, RF007
- UC04 Recuperar senha — RF005 *(← Serviço de E-mail)*

**Módulo 2 — Estoque**
- UC05 Registrar itens via QR Code — RF008
- UC06 Gerenciar itens manualmente — RF009
- UC07 Registrar consumo — RF010
- UC08 Consultar estoque e histórico — RF011, RF013
- UC09 Configurar alertas de estoque — RF012

**Módulo 3 — Financeiro**
- UC10 Gerenciar contas bancárias — RF014
- UC11 Registrar movimentações — RF015 *(← Sistema Bancário)*, RF016, RF017
- UC12 Consultar gastos e saldo — RF018, RF019
- UC13 Gerenciar orçamento — RF020, RF021

**Módulo 4 — Estudos**
- UC14 Gerenciar matérias — RF022
- UC15 Registrar / importar notas — RF024, RF023 *(← Instituição de Ensino)*
- UC16 Registrar tempo de estudo — RF025
- UC17 Consultar desempenho — RF026, RF027, RF028

**Módulo 5 — Lavanderia**
- UC18 Gerenciar peças e lavagens — RF029, RF030, RF032
- UC19 Receber alertas de lavanderia — RF031, RF033 *(inclui consulta ao estoque)*

## Diagrama (Mermaid)

```mermaid
graph LR
    Usuario["Usuário<br/>(Estudante)"]
    Instituicao["Instituição<br/>de Ensino"]
    Banco["Sistema<br/>Bancário"]
    Email["Serviço<br/>de E-mail"]

    subgraph Sistema["Hub Universitário"]
        subgraph M1["Módulo 1 — Conta"]
            UC01(["UC01 Cadastrar-se"])
            UC02(["UC02 Autenticar (login/logout)"])
            UC03(["UC03 Gerenciar perfil"])
            UC04(["UC04 Recuperar senha"])
        end
        subgraph M2["Módulo 2 — Estoque"]
            UC05(["UC05 Registrar itens via QR Code"])
            UC06(["UC06 Gerenciar itens manualmente"])
            UC07(["UC07 Registrar consumo"])
            UC08(["UC08 Consultar estoque e histórico"])
            UC09(["UC09 Configurar alertas de estoque"])
        end
        subgraph M3["Módulo 3 — Financeiro"]
            UC10(["UC10 Gerenciar contas bancárias"])
            UC11(["UC11 Registrar movimentações"])
            UC12(["UC12 Consultar gastos e saldo"])
            UC13(["UC13 Gerenciar orçamento"])
        end
        subgraph M4["Módulo 4 — Estudos"]
            UC14(["UC14 Gerenciar matérias"])
            UC15(["UC15 Registrar / importar notas"])
            UC16(["UC16 Registrar tempo de estudo"])
            UC17(["UC17 Consultar desempenho"])
        end
        subgraph M5["Módulo 5 — Lavanderia"]
            UC18(["UC18 Gerenciar peças e lavagens"])
            UC19(["UC19 Receber alertas de lavanderia"])
        end
    end

    Usuario --- UC01
    Usuario --- UC02
    Usuario --- UC03
    Usuario --- UC04
    Usuario --- UC05
    Usuario --- UC06
    Usuario --- UC07
    Usuario --- UC08
    Usuario --- UC09
    Usuario --- UC10
    Usuario --- UC11
    Usuario --- UC12
    Usuario --- UC13
    Usuario --- UC14
    Usuario --- UC15
    Usuario --- UC16
    Usuario --- UC17
    Usuario --- UC18
    Usuario --- UC19

    UC04 --- Email
    UC11 --- Banco
    UC15 --- Instituicao

    UC19 -. «include» .-> UC08

    classDef ator fill:#e8f0fe,stroke:#3b6ea5,stroke-width:2px,color:#1a1a1a;
    class Usuario,Instituicao,Banco,Email ator;
```
