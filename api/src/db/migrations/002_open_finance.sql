-- Open Finance (RF034–RF037, RN19–RN21, RNF17, RNF18).
--
-- O Xepa não é instituição participante (RNF18): fala com um provedor
-- autorizado. O que o banco guarda daqui é o consentimento, as contas que ele
-- destravou e a origem das transações importadas — nunca credencial bancária.

CREATE TABLE consentimento (
  id                     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id             INTEGER NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  instituicao_financeira TEXT NOT NULL CHECK (length(btrim(instituicao_financeira)) > 0),
  -- id do consentimento no provedor; é por ele que se sincroniza e se revoga
  id_externo             TEXT NOT NULL,
  -- RF037 — o escopo consentido fica visível para o usuário
  escopo                 TEXT NOT NULL CHECK (length(btrim(escopo)) > 0),
  status                 TEXT NOT NULL
                           CHECK (status IN ('pendente', 'ativo', 'expirado', 'revogado')),
  criado_em              TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em              TIMESTAMPTZ NOT NULL,
  revogado_em            TIMESTAMPTZ,
  -- RN21 — o consentimento tem prazo, e o teto é de 12 meses
  CONSTRAINT consentimento_prazo_valido
    CHECK (expira_em > criado_em AND expira_em <= criado_em + INTERVAL '12 months'),
  -- RN21 — revogado é o único estado que carrega data de revogação, e exige uma
  CONSTRAINT consentimento_revogacao_coerente
    CHECK ((status = 'revogado') = (revogado_em IS NOT NULL)),
  CONSTRAINT consentimento_externo_unico UNIQUE (usuario_id, id_externo)
);

CREATE INDEX idx_consentimento_usuario ON consentimento (usuario_id);

-- A conta pode nascer à mão (RF014) ou vir de um consentimento (RF035).
ALTER TABLE conta_bancaria
  ADD COLUMN consentimento_id INTEGER REFERENCES consentimento (id) ON DELETE SET NULL,
  ADD COLUMN tipo             TEXT NOT NULL DEFAULT 'corrente'
                                CHECK (tipo IN ('corrente', 'poupanca', 'pagamento')),
  ADD COLUMN id_externo       TEXT;

-- Conta importada traz id da instituição; conta cadastrada à mão, não.
ALTER TABLE conta_bancaria
  ADD CONSTRAINT conta_origem_coerente
    CHECK ((consentimento_id IS NULL) = (id_externo IS NULL));

-- Duas contas do mesmo consentimento nunca compartilham id na instituição —
-- é o que impede a mesma conta entrar duas vezes ao reautorizar.
CREATE UNIQUE INDEX idx_conta_externa_unica
  ON conta_bancaria (consentimento_id, id_externo)
  WHERE consentimento_id IS NOT NULL;

-- Transação importada do extrato.
ALTER TABLE transacao
  ADD COLUMN id_externo     TEXT,
  -- RN20 — marca a nota que já casou com a movimentação do extrato
  ADD COLUMN conciliada_em  TIMESTAMPTZ;

ALTER TABLE transacao
  DROP CONSTRAINT IF EXISTS transacao_origem_check;

ALTER TABLE transacao
  DROP CONSTRAINT IF EXISTS transacao_nota_coerente;

-- 'automatica' continua valendo: RF015 segue vivo no Android, só deixou de ser
-- o caminho principal da automação.
ALTER TABLE transacao
  ADD CONSTRAINT transacao_origem_valida
    CHECK (origem IN ('automatica', 'manual', 'nota', 'open_finance'));

ALTER TABLE transacao
  ADD CONSTRAINT transacao_nota_coerente
    CHECK ((origem = 'nota') = (nota_fiscal_id IS NOT NULL));

-- RN19 — a sincronização é idempetente porque o id da movimentação na
-- instituição é único dentro da conta: reimportar não cria uma segunda linha.
CREATE UNIQUE INDEX idx_transacao_externa_unica
  ON transacao (conta_id, id_externo)
  WHERE id_externo IS NOT NULL;

-- RN20 — só faz sentido conciliar o que veio do extrato ou de uma nota que
-- casou com ele; conciliada sem id externo seria conciliação com nada.
ALTER TABLE transacao
  ADD CONSTRAINT transacao_conciliacao_coerente
    CHECK (conciliada_em IS NULL OR id_externo IS NOT NULL);

-- RN20 — a busca da nota candidata é por usuário, valor e janela de data.
-- Não entra conta_id: a transação de nota nasce sem conta, porque o QR Code não
-- diz qual conta pagou. Indexar por conta aqui não serviria à consulta.
CREATE INDEX idx_transacao_conciliacao
  ON transacao (usuario_id, valor, data)
  WHERE origem = 'nota' AND conciliada_em IS NULL;
