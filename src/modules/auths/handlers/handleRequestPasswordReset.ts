import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import nodemailer from "nodemailer";
import crypto from "crypto";

export const handleRequestPasswordReset = async (
  req: FastifyRequest<{ Body: { email: string } }>,
  reply: FastifyReply
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return reply.status(400).send({ error: "Email requis" });
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Pour des raisons de sécurité, on renvoie toujours une réponse positive
    // même si l'email n'existe pas (éviter l'énumération d'emails)
    if (!user) {
      return reply.status(200).send({
        message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
      });
    }

    // Générer un token aléatoire sécurisé
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Définir l'expiration à 1 heure
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Sauvegarder le token en base de données
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Configurer le transporteur SMTP
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || smtpUser;

    if (!host || !smtpUser || !pass) {
      console.error("SMTP non configuré. Variables d'environnement manquantes.");
      return reply.status(500).send({ error: "Service d'email non configuré" });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass,
      },
    });

    // Construire le lien de réinitialisation
    const frontendUrl = "https://evaluation.madabel.com/";
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const subject = "Réinitialisation de votre mot de passe - MADABEL";

    const text = `Bonjour ${user.name},

Vous avez demandé la réinitialisation de votre mot de passe pour votre compte MADABEL.

Pour réinitialiser votre mot de passe, cliquez sur le lien ci-dessous :
${resetLink}

Ce lien est valable pendant 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe actuel restera inchangé.

Pour des raisons de sécurité, ne partagez jamais ce lien avec qui que ce soit.

L'équipe Madabel`;

    const html = `
      <p>Bonjour ${user.name},</p>
      
      <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte MADABEL.</p>
      
      <p>Pour réinitialiser votre mot de passe, cliquez sur le bouton ci-dessous :</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #EAB308; color: #000; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; font-weight: bold;
                  display: inline-block;">
          Réinitialiser mon mot de passe
        </a>
      </div>
      
      <p>Ou copiez et collez ce lien dans votre navigateur :</p>
      <p style="word-break: break-all; color: #666;">${resetLink}</p>
      
      <p><strong>Ce lien est valable pendant 1 heure.</strong></p>
      
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. 
         Votre mot de passe actuel restera inchangé.</p>
      
      <p style="color: #e74c3c;">⚠️ Pour des raisons de sécurité, ne partagez jamais ce lien avec qui que ce soit.</p>
      
      <p>L'équipe Madabel</p>
    `;

    // Envoyer l'email
    await transporter.sendMail({
      from,
      to: email,
      subject,
      text,
      html,
    });

    return reply.status(200).send({
      message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
    });
  } catch (error: any) {
    console.error("Erreur lors de la demande de réinitialisation:", error);
    return reply.status(500).send({
      error: "Erreur lors de l'envoi de l'email de réinitialisation",
      details: error.message,
    });
  }
};
