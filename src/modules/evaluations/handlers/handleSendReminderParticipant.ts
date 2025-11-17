import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import nodemailer from "nodemailer";

export const handleSendReminderParticipant = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'ID invalide' });

    // Récupérer le participant + user + évaluation avec plus de détails
    const participant = await prisma.evaluationParticipant.findUnique({
      where: { id },
      include: {
        user: true,
        evaluation: {
          include: {
            participants: {
              where: { participantRole: "EVALUATOR" },
              include: { user: true }
            }
          }
        }
      }
    });

    if (!participant) return reply.status(404).send({ error: 'Participant introuvable' });

    const toEmail = participant.user?.email;
    if (!toEmail) return reply.status(400).send({ error: 'Aucun email disponible pour le participant' });

    // Vérifier si un mail initial a déjà été envoyé
    if (!participant.mailSentAt) {
      return reply.status(400).send({ error: 'Aucun mail d\'invitation n\'a été envoyé précédemment' });
    }

    // Trouver le candidat évalué (pour personnaliser le message)
    const candidat = participant.evaluation?.participants?.[0];
    const candidatName = candidat?.user?.name || "la personne concernée";
    const deadline = participant.evaluation?.deadline;
    const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString('fr-FR') : "la date limite";

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

    const subject = `RAPPEL - Invitation à l'évaluation ${participant.evaluation?.ref ?? ''}`;

    const text = `Cher ${participant.user.name},

Ceci est un rappel concernant l'évaluation du leadership de MADABEL pour ${candidatName}.

L'évaluation est composée de 64 questions sur les compétences de leadership et prendra environ 10 minutes à compléter.

Veuillez compléter l'évaluation au plus tard le ${formattedDeadline}. Nous vous recommandons de compléter l'évaluation dans un délai d'une semaine.

Pour accéder à l'évaluation, il vous suffit de suivre les instructions reprises ci-dessous :
- Cliquez sur le lien web ci-dessous ou copiez et collez l'adresse complète dans votre navigateur web.
- Cliquez sur Connexion et suivez les instructions à l'écran.
- Pour vous connecter, utilisez votre adresse mail comme identifiant et le mot de passe suivant.

Si vous avez des questions concernant ces instructions, veuillez contacter le SUPERADMIN MADABEL à l'adresse admin@madabel.com.

Les réponses des évaluateurs sont collectées de manière anonyme et compilées en groupes d'évaluateurs pour les besoins du rapport. Les réponses des managers sont rapportées individuellement et peuvent ne pas être anonymes.

Vous aurez également la possibilité d'entrer des commentaires libres si vous le souhaitez.

N'OUBLIEZ PAS de cliquer sur SOUMETTRE L'ENQUÊTE en bas de la page des commentaires, même si vous ne souhaitez pas inclure de commentaires libres.

L'équipe Madabel`;

    const html = `
      <p>Cher ${participant.user.name},</p>

      <p>Ceci est un <strong>rappel</strong> concernant l'évaluation du leadership de MADABEL pour ${candidatName}.</p>

      <p>L'évaluation est composée de 64 questions sur les compétences de leadership et prendra environ 10 minutes à compléter.</p>

      <p>Veuillez compléter l'évaluation au plus tard le <strong>${formattedDeadline}</strong>. Nous vous recommandons de compléter l'évaluation dans un délai d'une semaine.</p>

      <p>Pour accéder à l'évaluation, il vous suffit de suivre les instructions reprises ci-dessous :</p>
      <ul>
        <li>Cliquez sur le lien web ci-dessous ou copiez et collez l'adresse complète dans votre navigateur web.</li>
        <li>Cliquez sur Connexion et suivez les instructions à l'écran.</li>
        <li>Pour vous connecter, utilisez votre adresse mail comme identifiant et le mot de passe suivant.</li>
      </ul>

      <p>Si vous avez des questions concernant ces instructions, veuillez contacter le SUPERADMIN MADABEL à l'adresse <a href="mailto:admin@madabel.com">admin@madabel.com</a>.</p>

      <p>Les réponses des évaluateurs sont collectées de manière anonyme et compilées en groupes d'évaluateurs pour les besoins du rapport. Les réponses des managers sont rapportées individuellement et peuvent ne pas être anonymes.</p>

      <p>Vous aurez également la possibilité d'entrer des commentaires libres si vous le souhaitez.</p>

      <p><strong>N'OUBLIEZ PAS</strong> de cliquer sur <strong>SOUMETTRE L'ENQUÊTE</strong> en bas de la page des commentaires, même si vous ne souhaitez pas inclure de commentaires libres.</p>

      <p>L'équipe Madabel</p>
    `;

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject,
      text,
      html,
    });

    // Mettre à jour le timestamp d'envoi de la relance
    await prisma.evaluationParticipant.update({
      where: { id },
      data: { reminderSentAt: new Date() }
    });

    return reply.status(200).send({ ok: true, info });
  } catch (error: any) {
    console.error('Erreur envoi relance:', error);
    return reply.status(500).send({ error: 'Erreur lors de l\'envoi de la relance', details: error.message });
  }
};

export default handleSendReminderParticipant;