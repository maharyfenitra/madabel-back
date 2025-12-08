import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Email service configuration and helpers
 */

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

let transporter: Transporter | null = null;

/**
 * Get email configuration from environment variables
 */
export function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    console.error("❌ SMTP non configuré. Variables d'environnement manquantes.");
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from: from || user,
  };
}

/**
 * Get or create email transporter
 */
export function getEmailTransporter(): Transporter | null {
  if (transporter) {
    return transporter;
  }

  const config = getEmailConfig();
  if (!config) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  return transporter;
}

/**
 * Send email using configured transporter
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    
    if (!transporter) {
      console.error("❌ Service d'email non configuré");
      return false;
    }

    const config = getEmailConfig();
    if (!config) {
      return false;
    }

    const mailOptions = {
      from: options.from || config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email envoyé:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    return false;
  }
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}

/**
 * Generate password reset email content
 */
export function createPasswordResetEmail(
  userName: string,
  resetLink: string,
  expiresInMinutes: number = 15
): { subject: string; text: string; html: string } {
  const subject = "Réinitialisation de votre mot de passe - MADABEL";

  const text = `Bonjour ${userName},

Vous avez demandé la réinitialisation de votre mot de passe pour votre compte MADABEL.

Pour réinitialiser votre mot de passe, cliquez sur le lien ci-dessous :
${resetLink}

Ce lien est valide pendant ${expiresInMinutes} minutes.

Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.

Cordialement,
L'équipe MADABEL`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Réinitialisation de mot de passe</h2>
      <p>Bonjour <strong>${userName}</strong>,</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte MADABEL.</p>
      <p>Pour réinitialiser votre mot de passe, cliquez sur le bouton ci-dessous :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 4px; display: inline-block;">
          Réinitialiser mon mot de passe
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        Ce lien est valide pendant ${expiresInMinutes} minutes.
      </p>
      <p style="color: #666; font-size: 14px;">
        Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">L'équipe MADABEL</p>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Generate evaluation invitation email content
 */
export function createEvaluationInvitationEmail(
  participantName: string,
  evaluationRef: string,
  candidatName: string,
  deadline: string,
  loginInstructions: string
): { subject: string; text: string; html: string } {
  const subject = `Invitation à l'évaluation ${evaluationRef}`;

  const text = `Bonjour ${participantName},

Vous êtes invité(e) à participer à l'évaluation de ${candidatName}.

Référence de l'évaluation : ${evaluationRef}
Date limite : ${deadline}

${loginInstructions}

Merci de votre participation.

Cordialement,
L'équipe MADABEL`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Invitation à une évaluation</h2>
      <p>Bonjour <strong>${participantName}</strong>,</p>
      <p>Vous êtes invité(e) à participer à l'évaluation de <strong>${candidatName}</strong>.</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Référence :</strong> ${evaluationRef}</p>
        <p style="margin: 5px 0;"><strong>Date limite :</strong> ${deadline}</p>
      </div>
      ${loginInstructions.replace(/\n/g, '<br>')}
      <p style="margin-top: 20px;">Merci de votre participation.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">L'équipe MADABEL</p>
    </div>
  `;

  return { subject, text, html };
}
