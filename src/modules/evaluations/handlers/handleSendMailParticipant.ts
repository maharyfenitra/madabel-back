import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import nodemailer from "nodemailer";
import { generatePassword, hashPassword } from "../../auths/services";

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

    // Générer un mot de passe temporaire si c'est la première connexion
    let temporaryPassword = "";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    
    if (participant.user.isFirstLogin) {
      // Générer un mot de passe aléatoire
      temporaryPassword = generatePassword(12);
      
      // Hasher et mettre à jour le mot de passe de l'utilisateur
      const hashedPassword = await hashPassword(temporaryPassword);
      await prisma.user.update({
        where: { id: participant.user.id },
        data: { password: hashedPassword }
      });
    }

    const loginInstructions = participant.user.isFirstLogin 
      ? `Pour vous connecter pour la première fois :
- Connectez-vous sur : ${frontendUrl}/auth/login
- Utilisez votre adresse email (${toEmail}) comme identifiant
- Utilisez le mot de passe temporaire suivant : ${temporaryPassword}
- Nous vous recommandons de changer ce mot de passe après votre première connexion`
      : `Pour vous connecter :
- Connectez-vous sur : ${frontendUrl}/auth/login
- Utilisez votre adresse email (${toEmail}) et votre mot de passe habituel`;

    const text = `Cher ${participant.user.name},

${candidatName} vous a demandé de bien vouloir l'évaluer dans le cadre de l'évaluation du leadership de MADABEL.

L'évaluation est composée de 64 questions sur les compétences de leadership et prendra environ 10 minutes à compléter. Ce courriel contient des instructions pour évaluer ce leader ou, si vous l'avez déjà vu, nous vous rappelons de l'évaluer dès que possible.

Veuillez compléter l'évaluation au plus tard le ${formattedDeadline}. Nous vous recommandons de compléter l'évaluation dans un délai d'une semaine. Nous vous remercions d'avance pour vos réponses et commentaires que vous voudrez bien indiquer dans le questionnaire.

${loginInstructions}

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
      
      ${participant.user.isFirstLogin 
        ? `<p><strong>Pour vous connecter pour la première fois :</strong></p>
      <ol>
        <li>Connectez-vous sur : <a href="${frontendUrl}/auth/login" style="color: #007bff; text-decoration: none;">${frontendUrl}/auth/login</a></li>
        <li>Utilisez votre adresse email (<strong>${toEmail}</strong>) comme identifiant</li>
        <li>Utilisez le mot de passe temporaire suivant : <strong style="background-color: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</strong></li>
        <li>Nous vous recommandons de changer ce mot de passe après votre première connexion</li>
      </ol>`
        : `<p><strong>Pour vous connecter :</strong></p>
      <ul>
        <li>Connectez-vous sur : <a href="${frontendUrl}/auth/login" style="color: #007bff; text-decoration: none;">${frontendUrl}/auth/login</a></li>
        <li>Utilisez votre adresse email (<strong>${toEmail}</strong>) et votre mot de passe habituel</li>
      </ul>`}
      
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

    // Mettre à jour le timestamp d'envoi du mail
    await prisma.evaluationParticipant.update({
      where: { id },
      data: { mailSentAt: new Date() }
    });

    return reply.status(200).send({ ok: true, info });
  } catch (error: any) {
    console.error('Erreur envoi mail:', error);
    return reply.status(500).send({ error: 'Erreur lors de l\'envoi du mail', details: error.message });
  }
};

export default handleSendMailParticipant;
