-- Xepa — schema inicial
--
-- Materializa as 18 entidades de docs/04-modelo-de-dados.md. Cada constraint
-- que existe para satisfazer uma regra de negócio cita a RN correspondente.
--
-- Convenções:
--   * chaves substitutas: INTEGER GENERATED ALWAYS AS IDENTITY
--   * dinheiro e quantidades: NUMERIC (nunca ponto flutuante)
--   * dados que pertencem ao usuário caem em cascata quando a conta é apagada
--     (LGPD, RNF08); tabelas de apoio compartilhadas usam RESTRICT/SET NULL

-- =====================================================================
-- Módulo 1 — Conta / Autenticação
-- =====================================================================

-- RN04 — a foto de perfil sai apenas desta lista; não há upload próprio.
CREATE TABLE avatar (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  descricao  TEXT NOT NULL,
  url        TEXT NOT NULL
);

CREATE TABLE instituicao (
  id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome  TEXT NOT NULL UNIQUE
);

CREATE TABLE usuario (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome           TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
  -- RN01 — e-mail único. A aplicação normaliza para minúsculas antes de
  -- gravar; o CHECK impede que uma variação em maiúsculas fure a unicidade.
  email          TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  -- RNF06 — nunca em texto puro. O hash é bcrypt, que já embute o salt; a
  -- coluna `salt` é mantida por fidelidade ao ER e guarda o mesmo salt.
  senha_hash     TEXT NOT NULL,
  salt           TEXT NOT NULL,
  avatar_id      INTEGER REFERENCES avatar (id) ON DELETE SET NULL,
  -- nulo enquanto não houver vínculo institucional (RN05)
  instituicao_id INTEGER REFERENCES instituicao (id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessão e recuperação de senha (SD02, SD03, SD04).
--
-- Os diagramas guardam o token no próprio usuário — uma sessão ativa por
-- conta. Aqui vai o SHA-256 do token, não o token em si: um vazamento do
-- banco não entrega sessões utilizáveis (RNF07).
ALTER TABLE usuario
  ADD COLUMN token_sessao_hash            TEXT,
  -- RNF09 — 30 minutos de inatividade; renovada a cada requisição autenticada
  ADD COLUMN token_sessao_expira_em       TIMESTAMPTZ,
  ADD COLUMN token_recuperacao_hash       TEXT,
  ADD COLUMN token_recuperacao_expira_em  TIMESTAMPTZ;

CREATE INDEX idx_usuario_token_sessao ON usuario (token_sessao_hash)
  WHERE token_sessao_hash IS NOT NULL;
CREATE INDEX idx_usuario_token_recuperacao ON usuario (token_recuperacao_hash)
  WHERE token_recuperacao_hash IS NOT NULL;

-- =====================================================================
-- Módulo 2 — Despensa (controle de estoque)
-- =====================================================================

CREATE TABLE produto (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id        INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  nome              TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
  -- texto livre; não confundir com a entidade CATEGORIA (financeira)
  categoria         TEXT,
  unidade           TEXT NOT NULL DEFAULT 'un',
  -- desnormalização intencional: derivável de movimentacao_estoque, mantida
  -- para leitura rápida e atualizada a cada movimentação.
  -- RN07 — a baixa não pode deixar a quantidade negativa.
  quantidade_atual  NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (quantidade_atual >= 0),
  -- RF012 — o usuário escolhe o que monitorar
  monitorado        BOOLEAN NOT NULL DEFAULT FALSE,
  -- RN08 — limite do alerta; obrigatório quando o item é monitorado
  quantidade_minima NUMERIC(12, 3) CHECK (quantidade_minima >= 0),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT produto_monitorado_exige_minima
    CHECK (NOT monitorado OR quantidade_minima IS NOT NULL)
);

CREATE INDEX idx_produto_usuario ON produto (usuario_id, nome);
-- suporte ao alerta de estoque (RF012) e ao de lavanderia (RF033)
CREATE INDEX idx_produto_monitorado ON produto (usuario_id) WHERE monitorado;

CREATE TABLE nota_fiscal (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  -- RN06 — uma nota já lida não pode ser processada de novo
  chave_acesso  TEXT NOT NULL UNIQUE,
  local_compra  TEXT,
  data_compra   DATE NOT NULL,
  valor_total   NUMERIC(12, 2) NOT NULL CHECK (valor_total >= 0),
  processada    BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nota_fiscal_usuario ON nota_fiscal (usuario_id, data_compra DESC);

CREATE TABLE item_nota (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nota_fiscal_id INTEGER NOT NULL REFERENCES nota_fiscal (id) ON DELETE CASCADE,
  -- nulo enquanto o item da nota não for conciliado com um produto da despensa
  produto_id     INTEGER REFERENCES produto (id) ON DELETE SET NULL,
  descricao      TEXT NOT NULL,
  quantidade     NUMERIC(12, 3) NOT NULL CHECK (quantidade > 0),
  valor_unitario NUMERIC(12, 2) NOT NULL CHECK (valor_unitario >= 0)
);

CREATE INDEX idx_item_nota_nota ON item_nota (nota_fiscal_id);
-- RF013 — histórico de valor pago e local de compra por item
CREATE INDEX idx_item_nota_produto ON item_nota (produto_id);

CREATE TABLE movimentacao_estoque (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produto (id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL CHECK (tipo IN ('entrada', 'baixa')),
  quantidade NUMERIC(12, 3) NOT NULL CHECK (quantidade > 0),
  data       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimentacao_produto ON movimentacao_estoque (produto_id, data DESC);

-- =====================================================================
-- Módulo 3 — Grana (financeiro)
-- =====================================================================

CREATE TABLE conta_bancaria (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  nome_banco    TEXT NOT NULL CHECK (length(btrim(nome_banco)) > 0),
  -- RN10 — saldo = saldo_inicial + entradas - saídas
  saldo_inicial NUMERIC(12, 2) NOT NULL DEFAULT 0,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conta_usuario ON conta_bancaria (usuario_id);

-- Categoria financeira (entidade). Distinta de produto.categoria (texto livre).
CREATE TABLE categoria (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  nome       TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
  CONSTRAINT categoria_nome_unico_por_usuario UNIQUE (usuario_id, nome)
);

CREATE TABLE transacao (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id     INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  -- nulo em despesa manual sem conta (dinheiro vivo)
  conta_id       INTEGER REFERENCES conta_bancaria (id) ON DELETE SET NULL,
  categoria_id   INTEGER REFERENCES categoria (id) ON DELETE SET NULL,
  -- 1:1 com a nota: uma nota processada gera exatamente uma transação, e o
  -- gasto do mês (RN11) sai só daqui — sem dupla contagem
  nota_fiscal_id INTEGER UNIQUE REFERENCES nota_fiscal (id) ON DELETE SET NULL,
  tipo           TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  valor          NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  data           DATE NOT NULL,
  origem         TEXT NOT NULL CHECK (origem IN ('automatica', 'manual', 'nota')),
  descricao      TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- toda transação de origem 'nota' aponta para a nota que a gerou, e só ela
  CONSTRAINT transacao_nota_coerente
    CHECK ((origem = 'nota') = (nota_fiscal_id IS NOT NULL)),
  -- RN09 — todo lançamento automático fica vinculado a uma conta cadastrada
  CONSTRAINT transacao_automatica_exige_conta
    CHECK (origem <> 'automatica' OR conta_id IS NOT NULL)
);

-- RN11 — soma das despesas do mês; RF018 — resumo por período e categoria
CREATE INDEX idx_transacao_usuario_data ON transacao (usuario_id, data DESC);
CREATE INDEX idx_transacao_categoria ON transacao (categoria_id, data);
-- RN10 — saldo por conta
CREATE INDEX idx_transacao_conta ON transacao (conta_id);

CREATE TABLE orcamento (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id     INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  categoria_id   INTEGER NOT NULL REFERENCES categoria (id) ON DELETE CASCADE,
  mes_referencia TEXT NOT NULL CHECK (mes_referencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- RN12 — o alerta dispara ao atingir 80% deste limite
  valor_limite   NUMERIC(12, 2) NOT NULL CHECK (valor_limite > 0),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- RN17 — no máximo um orçamento por usuário + categoria + mês
  CONSTRAINT orcamento_unico_por_categoria_mes
    UNIQUE (usuario_id, categoria_id, mes_referencia)
);

-- =====================================================================
-- Módulo 4 — Cabeça (estudos)
-- =====================================================================

CREATE TABLE materia (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id   INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  nome         TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
  -- RN15 — a média segue o método escolhido pelo usuário
  metodo_media TEXT NOT NULL DEFAULT 'simples'
    CHECK (metodo_media IN ('simples', 'ponderada')),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT materia_nome_unico_por_usuario UNIQUE (usuario_id, nome)
);

CREATE TABLE avaliacao (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  materia_id INTEGER NOT NULL REFERENCES materia (id) ON DELETE CASCADE,
  descricao  TEXT NOT NULL,
  valor      NUMERIC(6, 2) NOT NULL CHECK (valor >= 0),
  -- usado só quando metodo_media = 'ponderada' (RN15)
  peso       NUMERIC(6, 2) NOT NULL DEFAULT 1 CHECK (peso > 0),
  data       DATE NOT NULL,
  origem     TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'importada')),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RN16 — progressão compara as notas ao longo do tempo
CREATE INDEX idx_avaliacao_materia_data ON avaliacao (materia_id, data);

CREATE TABLE sessao_estudo (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  materia_id  INTEGER NOT NULL REFERENCES materia (id) ON DELETE CASCADE,
  data        DATE NOT NULL,
  duracao_min INTEGER NOT NULL CHECK (duracao_min > 0),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RF028 — estatísticas de tempo de estudo
CREATE INDEX idx_sessao_materia_data ON sessao_estudo (materia_id, data DESC);

-- =====================================================================
-- Módulo 5 — Roupa (lavanderia)
-- =====================================================================

CREATE TABLE peca_roupa (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  nome        TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
  tipo        TEXT,
  -- RN14 — a peça só entra na lista de "lavar" ao atingir este número de usos
  limite_usos INTEGER NOT NULL CHECK (limite_usos >= 1),
  -- desnormalização intencional: derivável de uso_peca, mantida para leitura
  -- rápida e atualizada a cada uso registrado
  usos_atuais INTEGER NOT NULL DEFAULT 0 CHECK (usos_atuais >= 0),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_peca_usuario ON peca_roupa (usuario_id);

CREATE TABLE uso_peca (
  id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  peca_id INTEGER NOT NULL REFERENCES peca_roupa (id) ON DELETE CASCADE,
  data    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_uso_peca_peca ON uso_peca (peca_id, data DESC);

CREATE TABLE lavagem (
  id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id     INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  data_agendada  TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'agendada'
    CHECK (status IN ('agendada', 'concluida', 'cancelada')),
  lembrete_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RF032/RN13 — lembretes e checagem de sabão/amaciante antes da lavagem
CREATE INDEX idx_lavagem_agenda ON lavagem (usuario_id, data_agendada)
  WHERE status = 'agendada';

CREATE TABLE lavagem_peca (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lavagem_id INTEGER NOT NULL REFERENCES lavagem (id) ON DELETE CASCADE,
  peca_id    INTEGER NOT NULL REFERENCES peca_roupa (id) ON DELETE CASCADE,
  CONSTRAINT lavagem_peca_sem_repeticao UNIQUE (lavagem_id, peca_id)
);

CREATE INDEX idx_lavagem_peca_peca ON lavagem_peca (peca_id);
