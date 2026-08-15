import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (['1', 'true', 'sim', 'on'].includes(raw)) return true;
  if (['0', 'false', 'nao', 'não', 'off'].includes(raw)) return false;
  throw new Error(`Variável de ambiente ${name} deve ser true ou false`);
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Variável de ambiente ${name} deve ser numérica`);
  }
  return parsed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: num('PORT', 3333),
  databaseUrl: required('DATABASE_URL'),
  /** Conexões simultâneas no pool. */
  dbPoolMax: num('DB_POOL_MAX', 10),

  /**
   * Conexão TLS com o banco.
   *
   * Postgres gerenciado (Neon, Supabase, Railway, Aiven…) **exige** TLS, e é
   * comum apontar para um deles ainda em desenvolvimento. Por isso o SSL é uma
   * variável própria: sem ela, ligar TLS obrigaria a mentir o `NODE_ENV`.
   * Vazio mantém o padrão antigo — ligado em produção, desligado fora dela.
   */
  dbSsl: bool('DB_SSL', process.env.NODE_ENV === 'production'),

  /** RNF09 — a sessão expira após 30 minutos de inatividade. */
  sessionTtlMinutes: num('SESSION_TTL_MINUTES', 30),

  /** RF005 — validade do token de redefinição de senha. */
  resetTokenTtlMinutes: num('RESET_TOKEN_TTL_MINUTES', 30),

  /**
   * Integração de notas com a instituição (RF023). Vazio = indisponível, que
   * é o normal; "stub" liga um conjunto fixo de notas fora de produção.
   */
  instituicaoIntegracao: process.env.INSTITUICAO_INTEGRACAO ?? '',

  mail: {
    host: process.env.SMTP_HOST ?? '',
    port: num('SMTP_PORT', 587),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.MAIL_FROM ?? 'nao-responda@xepa.app',
    resetUrl: process.env.APP_RESET_URL ?? 'xepa://redefinir-senha',
  },
} as const;

export const isProduction = env.nodeEnv === 'production';
