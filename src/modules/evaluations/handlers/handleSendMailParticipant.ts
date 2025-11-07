import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import nodemailer from "nodemailer";

export const handleSendMailParticipant = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'ID invalide' });

    // Récupérer le participant + user
    const participant = await prisma.evaluationParticipant.findUnique({
      where: { id },
      include: { user: true, evaluation: true }
    });

    if (!participant) return reply.status(404).send({ error: 'Participant introuvable' });

    const toEmail = participant.user?.email;
    if (!toEmail) return reply.status(400).send({ error: 'Aucun email disponible pour le participant' });

    // lire la configuration SMTP depuis les variables d'environnement
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass) {
        if (!host) console.error('SMTP_HOST non configuré.');
        if (!user) console.error('SMTP_USER non configuré.');
        if (!pass) console.error('SMTP_PASS non configuré.');   
      console.error('SMTP non configuré. Variables d\'environnement manquantes.');
      return reply.status(500).send({ error: 'SMTP non configuré sur le serveur' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    const subject = `Invitation à l'évaluation ${participant.evaluation?.ref ?? ''}`;
    const text = `Bonjour ${participant.user.name},\n\nVous êtes invité(e) à participer à l'évaluation ${participant.evaluation?.ref ?? ''}.\n\nCordialement,\nL'équipe`;
    const html = `
      <p>Bonjour ${participant.user.name},</p>
      <p>Vous êtes invité(e) à participer à l'évaluation <strong>${participant.evaluation?.ref ?? ''}</strong>.</p>
      <p>Cordialement,<br/>L'équipe</p>
    `;

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text,
      html,
    });

    return reply.status(200).send({ ok: true, info });
  } catch (error: any) {
    console.error('Erreur envoi mail:', error);
    return reply.status(500).send({ error: 'Erreur lors de l\'envoi du mail', details: error.message });
  }
};

export default handleSendMailParticipant;
