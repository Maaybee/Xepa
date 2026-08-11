import { env } from '../config/env.js';

/**
 * Integração com o Serviço de E-mail (ator secundário dos casos de uso).
 *
 * Sem SMTP_HOST configurado, o e-mail é apenas registrado no console — é o
 * modo de desenvolvimento, que deixa o fluxo do SD04 testável ponta a ponta
 * sem depender de um provedor.
 */

export interface Email {
  para: string;
  assunto: string;
  corpo: string;
}

export async function enviar(email: Email): Promise<void> {
  if (!env.mail.host) {
    console.log(
      `[email] (dev, sem SMTP) para=${email.para} assunto="${email.assunto}"\n${email.corpo}`,
    );
    return;
  }

  // TODO: enviar via SMTP quando o provedor for definido.
  throw new Error('Envio por SMTP ainda não implementado.');
}

/** SD04 — link de redefinição de senha. */
export async function enviarRecuperacaoSenha(para: string, token: string): Promise<void> {
  const link = `${env.mail.resetUrl}?token=${token}`;
  await enviar({
    para,
    assunto: 'Xepa — redefinição de senha',
    corpo:
      `Você pediu para redefinir sua senha no Xepa.\n\n` +
      `Abra este link para escolher uma nova: ${link}\n\n` +
      `O link vale por ${env.resetTokenTtlMinutes} minutos. ` +
      `Se não foi você, ignore este e-mail — nada muda.`,
  });
}
