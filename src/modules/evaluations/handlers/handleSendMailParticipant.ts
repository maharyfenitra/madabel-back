import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import {
  sendEmail,
  generateTemporaryPassword,
  getLoginInstructions,
} from "../../service";

export const handleSendMailParticipant = async (req: FastifyRequest, reply: FastifyReply) => {
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

    // Trouver le candidat évalué (pour personnaliser le message)
    const candidat = participant.evaluation?.participants?.[0];
    const candidatName = candidat?.user?.name || "la personne concernée";
    const deadline = participant.evaluation?.deadline;
    const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString('fr-FR') : "la date limite";

    const subject = `Invitation à l'évaluation ${participant.evaluation?.ref ?? ''}`;

    let temporaryPassword = "";
    if (participant.user.isFirstLogin) {
      temporaryPassword = await generateTemporaryPassword(participant.user.id);
    }

    const loginInstructions = getLoginInstructions(
      toEmail,
      participant.user.isFirstLogin,
      temporaryPassword
    );

    const text = `Cher ${participant.user.name},

${candidatName} vous a demandé de bien vouloir l'évaluer dans le cadre de l'évaluation du leadership de MADABEL.

L'évaluation est composée de 64 questions sur les compétences de leadership et prendra environ 10 minutes à compléter. Ce courriel contient des instructions pour évaluer ce leader ou, si vous l'avez déjà vu, nous vous rappelons de l'évaluer dès que possible.

Veuillez compléter l'évaluation au plus tard le ${formattedDeadline}. Nous vous recommandons de compléter l'évaluation dans un délai d'une semaine. Nous vous remercions d'avance pour vos réponses et commentaires que vous voudrez bien indiquer dans le questionnaire.

${loginInstructions.text}

Si vous avez des questions concernant ces instructions, veuillez contacter le SUPERADMIN MADABEL à l'adresse admin@madabel.com.

Les réponses des évaluateurs sont collectées de manière anonyme et compilées en groupes d'évaluateurs pour les besoins du rapport. Les réponses des managers sont rapportées individuellement et peuvent ne pas être anonymes.

Vous aurez également la possibilité d'entrer des commentaires libres si vous le souhaitez.

N'OUBLIEZ PAS de cliquer sur SOUMETTRE L'ENQUÊTE en bas de la page des commentaires, même si vous ne souhaitez pas inclure de commentaires libres.

L'équipe Madabel`;

    const html = `
      <p>Cher ${participant.user.name},</p>
      
      <p>${candidatName} vous a demandé de bien vouloir l'évaluer dans le cadre de l'évaluation du leadership de MADABEL.</p>
      
      <p>L'évaluation est composée de 64 questions sur les compétences de leadership et prendra environ 10 minutes à compléter. Ce courriel contient des instructions pour évaluer ce leader ou, si vous l'avez déjà vu, nous vous rappelons de l'évaluer dès que possible.</p>
      
      <p>Veuillez compléter l'évaluation au plus tard le <strong>${formattedDeadline}</strong>. Nous vous recommandons de compléter l'évaluation dans un délai d'une semaine. Nous vous remercions d'avance pour vos réponses et commentaires que vous voudrez bien indiquer dans le questionnaire.</p>
      
      ${loginInstructions.html}
      
      <p>Si vous avez des questions concernant ces instructions, veuillez contacter le SUPERADMIN MADABEL à l'adresse <a href="mailto:admin@madabel.com">admin@madabel.com</a>.</p>
      
      <p>Les réponses des évaluateurs sont collectées de manière anonyme et compilées en groupes d'évaluateurs pour les besoins du rapport. Les réponses des managers sont rapportées individuellement et peuvent ne pas être anonymes.</p>
      
      <p>Vous aurez également la possibilité d'entrer des commentaires libres si vous le souhaitez.</p>
      
      <p><strong>N'OUBLIEZ PAS</strong> de cliquer sur <strong>SOUMETTRE L'ENQUÊTE</strong> en bas de la page des commentaires, même si vous ne souhaitez pas inclure de commentaires libres.</p>
      
      <p>L'équipe Madabel</p>
    `;

    const success = await sendEmail({
      to: toEmail,
      subject,
      text,
      html,
    });

    if (!success) {
      return reply.status(500).send({ error: 'Erreur lors de l\'envoi du mail' });
    }

    await prisma.evaluationParticipant.update({
      where: { id },
      data: { mailSentAt: new Date() }
    });

    return reply.status(200).send({ ok: true });
  } catch (error: any) {
    console.error('Erreur envoi mail:', error);
    return reply.status(500).send({ error: 'Erreur lors de l\'envoi du mail', details: error.message });
  }
};

export default handleSendMailParticipant;
