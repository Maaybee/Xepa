import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
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

  /** RNF09 — a sessão expira após 30 minutos de inatividade. */
  sessionTtlMinutes: num('SESSION_TTL_MINUTES', 30),

  /** RF005 — validade do token de redefinição de senha. */
  resetTokenTtlMinutes: num('RESET_TOKEN_TTL_MINUTES', 30),

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
