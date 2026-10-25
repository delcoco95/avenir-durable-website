import nodemailer from "nodemailer";

export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

/**
 * Envoi d'un e-mail via SMTP. Si la messagerie n'est pas configurée, la
 * fonction ne fait rien et renvoie false : les demandes restent consultables
 * dans l'administration.
 */
export async function sendMail(opts: { to: string; subject: string; text: string; replyTo?: string }) {
  if (!isMailConfigured() || !opts.to) return false;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: opts.to,
      subject: opts.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
      text: opts.text,
      replyTo: opts.replyTo,
    });
    return true;
  } catch (err) {
    console.error("[mail] échec d'envoi :", err instanceof Error ? err.message : err);
    return false;
  }
}
