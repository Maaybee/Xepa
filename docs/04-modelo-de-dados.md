# Modelo de Dados (ER)

Banco relacional, 18 entidades cobrindo os 5 módulos. Código na DSL do Eraser (inserir um **Entity Relationship Diagram** e colar).

## Notas de design (importante)

- **Unicidade**: `USUARIO.email` (RN01) e `NOTA_FISCAL.chave_acesso` (RN06) são únicos. `ORCAMENTO` é único por `usuario_id + categoria_id + mes_referencia` (RN17).
- **Nota → 1 transação**: `NOTA_FISCAL` ↔ `TRANSACAO` é 1:1; uma nota processada gera exatamente uma transação (origem="nota", categoria="Mercado" por RN18). O gasto do mês (RN11) sai só de `TRANSACAO`, sem dupla contagem.
- **Duas categorias distintas**: `PRODUTO.categoria` é texto livre (despensa); `CATEGORIA` é entidade (financeira) e é a que o `ORCAMENTO` referencia.
- **Desnormalização intencional**: `PRODUTO.quantidade_atual` e `PECA_ROUPA.usos_atuais` são deriváveis (de `MOVIMENTACAO_ESTOQUE` e `USO_PECA`), mas mantidos como coluna para leitura rápida — atualizar a cada movimentação.
- **Estoque vs. financeiro**: `MOVIMENTACAO_ESTOQUE` (entrada/baixa de itens) é separada de `TRANSACAO` (movimento financeiro).
- **Sabão e amaciante** são `PRODUTO` como os demais (RN13).

## Código Eraser

```entity-relationship-diagram
title ER do sistema

USUARIO [color: Purple] {
  id int [pk]
  nome string
  email string [unique, note: "único (RN01)"]
  senha_hash string
  salt string
  avatar_id int [fk]
  instituicao_id int [fk, note: "nulo se sem vínculo"]
  criado_em datetime
}

INSTITUICAO {
  id int [pk]
  nome string
}

AVATAR [color: Black] {
  id int [pk]
  descricao string
  url string
}

PRODUTO [color: Blue] {
  id int [pk]
  usuario_id int [fk]
  nome string
  categoria string [note: "texto livre; distinta da entidade CATEGORIA (financeira)"]
  unidade string
  quantidade_atual decimal
  monitorado boolean [note: "RF012"]
  quantidade_minima decimal [note: "RN08"]
}

NOTA_FISCAL [color: Green] {
  id int [pk]
  usuario_id int [fk]
  chave_acesso string [unique, note: "único (RN06)"]
  local_compra string
  data_compra date
  valor_total decimal
  processada boolean [note: "nota processada gera 1 TRANSACAO (origem='nota')"]
}

ITEM_NOTA {
  id int [pk]
  nota_fiscal_id int [fk]
  produto_id int [fk]
  descricao string
  quantidade decimal
  valor_unitario decimal
}

MOVIMENTACAO_ESTOQUE {
  id int [pk]
  produto_id int [fk]
  tipo string [note: "entrada / baixa"]
  quantidade decimal
  data datetime
}

CONTA_BANCARIA {
  id int [pk]
  usuario_id int [fk]
  consentimento_id int [fk, note: "nulo quando a conta foi cadastrada à mão (RF014)"]
  nome_banco string
  saldo_inicial decimal
  tipo string [note: "corrente / poupanca / pagamento"]
  id_externo string [note: "id da conta na instituição; único por consentimento"]
}

CONSENTIMENTO [color: Blue] {
  id int [pk]
  usuario_id int [fk]
  instituicao_financeira string
  escopo string [note: "o que foi consentido: contas, extrato"]
  status string [note: "pendente / ativo / expirado / revogado"]
  criado_em datetime
  expira_em datetime [note: "RN21 — teto de 12 meses"]
  revogado_em datetime [note: "nulo enquanto não revogado"]
}

CATEGORIA {
  id int [pk]
  usuario_id int [fk]
  nome string
}

TRANSACAO [color: Red] {
  id int [pk]
  conta_id int [fk]
  categoria_id int [fk]
  nota_fiscal_id int [fk, note: "nulo se manual/auto; gasto do mês (RN11) sai só daqui, sem dupla contagem"]
  tipo string [note: "entrada / saida"]
  valor decimal
  data date
  origem string [note: "manual / nota / open_finance"]
  descricao string
  id_externo string [note: "id da movimentação na instituição; RN19 — único por conta, é o que torna a sincronização idempotente"]
  conciliada_em datetime [note: "RN20 — quando a nota casou com a movimentação do extrato; nulo enquanto não conciliada"]
}

ORCAMENTO {
  id int [pk]
  usuario_id int [fk]
  categoria_id int [fk]
  mes_referencia string [note: "único por usuário + categoria + mês (RN17)"]
  valor_limite decimal [note: "alerta em 80% (RN12)"]
}

MATERIA [color: Orange] {
  id int [pk]
  usuario_id int [fk]
  nome string
  metodo_media string [note: "simples / ponderada (RN15)"]
}

AVALIACAO [color: Yellow] {
  id int [pk]
  materia_id int [fk]
  descricao string
  valor decimal
  peso decimal
  data date
  origem string [note: "manual / importada"]
}

SESSAO_ESTUDO {
  id int [pk]
  materia_id int [fk]
  data date
  duracao_min int
}

PECA_ROUPA {
  id int [pk]
  usuario_id int [fk]
  nome string
  tipo string
  limite_usos int [note: "RN14"]
  usos_atuais int
}

USO_PECA {
  id int [pk]
  peca_id int [fk]
  data datetime
}

LAVAGEM {
  id int [pk]
  usuario_id int [fk]
  data_agendada datetime
  status string
  lembrete_ativo boolean
}

LAVAGEM_PECA {
  id int [pk]
  lavagem_id int [fk]
  peca_id int [fk]
}

// ===== RELACIONAMENTOS =====

INSTITUICAO.id > USUARIO.instituicao_id
AVATAR.id > USUARIO.avatar_id
USUARIO.id > CONTA_BANCARIA.usuario_id
USUARIO.id > PRODUTO.usuario_id
USUARIO.id > NOTA_FISCAL.usuario_id
USUARIO.id > CATEGORIA.usuario_id
USUARIO.id > ORCAMENTO.usuario_id
USUARIO.id > MATERIA.usuario_id
USUARIO.id > PECA_ROUPA.usuario_id
USUARIO.id > LAVAGEM.usuario_id
NOTA_FISCAL.id > ITEM_NOTA.nota_fiscal_id
PRODUTO.id > ITEM_NOTA.produto_id
PRODUTO.id > MOVIMENTACAO_ESTOQUE.produto_id
CONTA_BANCARIA.id > TRANSACAO.conta_id
USUARIO.id > CONSENTIMENTO.usuario_id
CONSENTIMENTO.id > CONTA_BANCARIA.consentimento_id
CATEGORIA.id > TRANSACAO.categoria_id
CATEGORIA.id > ORCAMENTO.categoria_id
NOTA_FISCAL.id - TRANSACAO.nota_fiscal_id
MATERIA.id > AVALIACAO.materia_id
MATERIA.id > SESSAO_ESTUDO.materia_id
PECA_ROUPA.id > USO_PECA.peca_id
LAVAGEM.id > LAVAGEM_PECA.lavagem_id
PECA_ROUPA.id > LAVAGEM_PECA.peca_id
```
