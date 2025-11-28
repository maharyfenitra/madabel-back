import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Configuration SMTP du serveur
 */
export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/**
 * Récupérer la configuration SMTP depuis les variables d'environnement
 */
export const getSMTPConfig = (): SMTPConfig | null => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    console.error("SMTP non configuré. Variables d'environnement manquantes:");
    if (!host) console.error("- SMTP_HOST");
    if (!user) console.error("- SMTP_USER");
    if (!pass) console.error("- SMTP_PASS");
    return null;
  }

  return { host, port, user, pass, from: from || user };
};

/**
 * Créer un transporter nodemailer
 */
export const createEmailTransporter = (config: SMTPConfig): Transporter => {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

/**
 * Envoyer un email
 */
export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const config = getSMTPConfig();
    if (!config) {
      console.error("Impossible d'envoyer l'email: SMTP non configuré");
      return false;
    }

    const transporter = createEmailTransporter(config);

    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });

    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return false;
  }
};
