import { prisma } from "../../utils";
import { sendEmail } from "../../utils/services/emailService";
import { createEvaluationReminderEmail } from "../../utils/services/reminderEmail";
import { generateTemporaryPassword, getLoginInstructions } from "../service/participantAuth";

/**
 * Service de relance automatique pour les participants qui n'ont pas complété leur évaluation
 */
export class ReminderService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Génère le contenu de l'email selon le rôle du participant
   */
  private getEmailContent(
    participantName: string,
    participantRole: string,
    candidatName: string,
    evaluationRef: string,
    formattedDeadline: string,
    loginInstructions: { text: string; html: string }
  ) {
    if (participantRole === "CANDIDAT") {
      // Email pour le candidat (auto-évaluation)
      const subject = `Auto-évaluation de leadership - ${evaluationRef}`;
      const text = `Cher ${participantName},

Vous êtes invité à compléter votre auto-évaluation de leadership dans le cadre de l'évaluation MADABEL.

L'évaluation est composée de 64 questions sur les compétences de leadership et prendra environ 10 minutes à compléter. Cette auto-évaluation est une occasion de réfléchir sur votre propre style de leadership.

Veuillez compléter l'évaluation au plus tard le ${formattedDeadline}. Nous vous recommandons de compléter l'évaluation dans un délai d'une semaine.

${loginInstructions.text}

Si vous avez des questions concernant ces instructions, veuillez contacter le SUPERADMIN MADABEL à l'adresse admin@madabel.com.

Vos réponses seront traitées de manière confidentielle et utilisées uniquement pour générer votre rapport de leadership.

N'OUBLIEZ PAS de cliquer sur SOUMETTRE L'ENQUÊTE en bas de la page des commentaires, même si vous ne souhaitez pas inclure de commentaires libres.

L'équipe Madabel`;

      const html = `
      <p>Cher ${participantName},</p>
      
      <p>Vous êtes invité à compléter votre <strong>auto-évaluation de leadership</strong> dans le cadre de l'évaluation MADABEL.</p>
      
      <p>L'évaluation est composée de 64 questions sur les compétences de leadership et prendra environ 10 minutes à compléter. Cette auto-évaluation est une occasion de réfléchir sur votre propre style de leadership.</p>
      
      <p>Veuillez compléter l'évaluation au plus tard le <strong>${formattedDeadline}</strong>. Nous vous recommandons de compléter l'évaluation dans un délai d'une semaine.</p>
      
      ${loginInstructions.html}
      
      <p>Si vous avez des questions concernant ces instructions, veuillez contacter le SUPERADMIN MADABEL à l'adresse <a href="mailto:admin@madabel.com">admin@madabel.com</a>.</p>
      
      <p>Vos réponses seront traitées de manière confidentielle et utilisées uniquement pour générer votre rapport de leadership.</p>
      
      <p><strong>N'OUBLIEZ PAS</strong> de cliquer sur <strong>SOUMETTRE L'ENQUÊTE</strong> en bas de la page des commentaires, même si vous ne souhaitez pas inclure de commentaires libres.</p>
      
      <p>L'équipe Madabel</p>
    `;

      return { subject, text, html };
    } else {
      // Email pour l'évaluateur
      const subject = `Invitation à l'évaluation ${evaluationRef}`;
      const text = `Cher ${participantName},

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
      <p>Cher ${participantName},</p>
      
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

      return { subject, text, html };
    }
  }

  /**
   * Démarre le service de relance automatique
   */
  async start() {
    if (this.isRunning) {
      console.log("⏰ Le service de relance est déjà en cours d'exécution");
      return;
    }

    console.log("🚀 Démarrage du service de relance automatique...");
    this.isRunning = true;

    // Envoyer immédiatement les relances au démarrage
    await this.sendRemindersAtStartup();

    // Puis vérifier toutes les 5 minutes
    this.intervalId = setInterval(async () => {
      await this.checkAndSendReminders();
    }, 5 * 60 * 1000); // 5 minutes

    console.log("✅ Service de relance automatique démarré");
  }

  /**
   * Arrête le service de relance automatique
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log("🛑 Service de relance automatique arrêté");
    }
  }

  /**
   * Envoie les relances au démarrage du serveur (sans vérifier la fréquence)
   */
  private async sendRemindersAtStartup() {
    try {
      console.log("🔔 Envoi des relances au démarrage du serveur...");

      // Récupérer la configuration
      const config = await prisma.systemConfig.findFirst();

      if (!config || !config.reminderEnabled) {
        console.log("⏸️  Relances désactivées dans la configuration");
        return;
      }

      // Trouver tous les participants qui n'ont pas complété leur évaluation
      const now = new Date();
      const incompleteParticipants = await prisma.evaluationParticipant.findMany({
        where: {
          completedAt: null,
          evaluation: {
            isCompleted: false,
            deadline: {
              gte: now, // La deadline n'est pas encore passée
            },
          },
        },
        include: {
          user: true,
          evaluation: {
            include: {
              participants: {
                where: {
                  participantRole: "CANDIDAT",
                },
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      console.log(`📧 ${incompleteParticipants.length} participant(s) à relancer au démarrage`);

      // Envoyer les emails de relance seulement à ceux qui ont déjà reçu au moins un mail
      let sentCount = 0;
      for (const participant of incompleteParticipants) {
        try {
          // Sauter les participants qui n'ont jamais reçu de mail (ils recevront le mail immédiat)
          if (!participant.mailSentAt) {
            console.log(`⏭️  Participant ${participant.user.email} n'a jamais reçu de mail, sera géré par l'envoi immédiat`);
            continue;
          }

          console.log(`🔍 Vérification participant: ${participant.user.name} (${participant.user.email})`);
          
          if (!participant.user.email) {
            console.log(`⚠️  Aucun email pour le participant ${participant.user.name}`);
            continue;
          }

          // Trouver le candidat pour le contexte de l'email
          const candidat = participant.evaluation.participants.find(
            (p: any) => p.participantRole === "CANDIDAT"
          );
          
          // Si c'est un évaluateur et qu'il n'y a pas de candidat, on ne peut pas envoyer de relance
          if (participant.participantRole === "EVALUATOR" && !candidat) {
            console.log(`⚠️  Pas de candidat pour l'évaluateur ${participant.user.email}, relance ignorée`);
            continue;
          }
          
          const candidatName = candidat?.user.name || participant.user.name;

          console.log(`📤 Préparation de l'envoi pour ${participant.user.email}...`);

          // Préparer les informations pour le mail d'invitation
          const deadline = participant.evaluation.deadline;
          const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString('fr-FR') : "la date limite";

          // Générer mot de passe temporaire si première connexion
          let temporaryPassword = "";
          if (participant.user.isFirstLogin) {
            temporaryPassword = await generateTemporaryPassword(participant.user.id);
          }

          const loginInstructions = getLoginInstructions(
            participant.user.email,
            participant.user.isFirstLogin,
            temporaryPassword
          );

          // Obtenir le contenu de l'email selon le rôle
          const emailContent = this.getEmailContent(
            participant.user.name,
            participant.participantRole,
            candidatName,
            participant.evaluation.ref,
            formattedDeadline,
            loginInstructions
          );

          await sendEmail({
            to: participant.user.email,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html,
          });

          // Incrémenter le compteur de relances
          await prisma.evaluationParticipant.update({
            where: { id: participant.id },
            data: { 
              reminderCount: (participant.reminderCount || 0) + 1,
              mailSentAt: new Date()
            }
          });

          sentCount++;
          console.log(`✉️  Relance de démarrage envoyée à ${participant.user.email}`);
        } catch (error) {
          console.error(`❌ Erreur lors de l'envoi de la relance à ${participant.user.email}:`, error);
        }
      }

      // Mettre à jour la date de dernière vérification
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          lastReminderCheck: now,
        },
      });

      console.log(`✅ ${sentCount} relance(s) envoyée(s) au démarrage`);
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi des relances au démarrage:", error);
    }
  }

  /**
   * Vérifie et envoie les relances si nécessaire
   */
  private async checkAndSendReminders() {
    try {
      // Récupérer la configuration
      const config = await prisma.systemConfig.findFirst();

      if (!config || !config.reminderEnabled) {
        console.log("⏸️  Relances désactivées dans la configuration");
        return;
      }

      const now = new Date();
      const frequencyInMs = this.getFrequencyInMilliseconds(config.reminderFrequency);

      // Vérifier si assez de temps s'est écoulé depuis la dernière vérification
      if (config.lastReminderCheck) {
        const timeSinceLastCheck = now.getTime() - config.lastReminderCheck.getTime();
        if (timeSinceLastCheck < frequencyInMs) {
          console.log(`⏳ Attente avant la prochaine vérification (${Math.round((frequencyInMs - timeSinceLastCheck) / 1000 / 60)} minutes restantes)`);
          return;
        }
      }

      console.log("🔍 Vérification des participants à relancer...");

      // Trouver tous les participants qui n'ont pas complété leur évaluation
      const incompleteParticipants = await prisma.evaluationParticipant.findMany({
        where: {
          completedAt: null,
          evaluation: {
            isCompleted: false,
            deadline: {
              gte: now, // La deadline n'est pas encore passée
            },
          },
        },
        include: {
          user: true,
          evaluation: {
            include: {
              participants: {
                where: {
                  participantRole: "CANDIDAT",
                },
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      console.log(`📧 ${incompleteParticipants.length} participant(s) à relancer`);

      // Envoyer les emails de relance seulement à ceux qui ont déjà reçu au moins un mail
      let sentCount = 0;
      for (const participant of incompleteParticipants) {
        try {
          // Sauter les participants qui n'ont jamais reçu de mail (ils recevront le mail immédiat)
          if (!participant.mailSentAt) {
            console.log(`⏭️  Participant ${participant.user.email} n'a jamais reçu de mail, sera géré par l'envoi immédiat`);
            continue;
          }

          if (!participant.user.email) {
            continue;
          }

          // Trouver le candidat pour le contexte de l'email
          const candidat = participant.evaluation.participants.find(
            (p: any) => p.participantRole === "CANDIDAT"
          );
          
          // Si c'est un évaluateur et qu'il n'y a pas de candidat, on ne peut pas envoyer de relance
          if (participant.participantRole === "EVALUATOR" && !candidat) {
            console.log(`⚠️  Pas de candidat pour l'évaluateur ${participant.user.email}, relance ignorée`);
            continue;
          }
          
          const candidatName = candidat?.user.name || participant.user.name;

          // Préparer les informations pour le mail d'invitation
          const deadline = participant.evaluation.deadline;
          const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString('fr-FR') : "la date limite";

          // Générer mot de passe temporaire si première connexion
          let temporaryPassword = "";
          if (participant.user.isFirstLogin) {
            temporaryPassword = await generateTemporaryPassword(participant.user.id);
          }

          const loginInstructions = getLoginInstructions(
            participant.user.email,
            participant.user.isFirstLogin,
            temporaryPassword
          );

          // Obtenir le contenu de l'email selon le rôle
          const emailContent = this.getEmailContent(
            participant.user.name,
            participant.participantRole,
            candidatName,
            participant.evaluation.ref,
            formattedDeadline,
            loginInstructions
          );

          await sendEmail({
            to: participant.user.email,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html,
          });

          // Incrémenter le compteur de relances
          await prisma.evaluationParticipant.update({
            where: { id: participant.id },
            data: { 
              reminderCount: (participant.reminderCount || 0) + 1,
              mailSentAt: new Date()
            }
          });

          sentCount++;
          console.log(`✉️  Relance envoyée à ${participant.user.email}`);
        } catch (error) {
          console.error(`❌ Erreur lors de l'envoi de la relance à ${participant.user.email}:`, error);
        }
      }

      // Mettre à jour la date de dernière vérification
      await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          lastReminderCheck: now,
        },
      });

      console.log(`✅ ${sentCount} relance(s) envoyée(s) avec succès`);
    } catch (error) {
      console.error("❌ Erreur lors de la vérification des relances:", error);
    }
  }

  /**
   * Convertit la fréquence en millisecondes
   */
  private getFrequencyInMilliseconds(frequency: string): number {
    const frequencies: Record<string, number> = {
      HOURLY_1: 60 * 60 * 1000, // 1 heure
      HOURLY_2: 2 * 60 * 60 * 1000, // 2 heures
      DAILY_1: 24 * 60 * 60 * 1000, // 1 jour
      DAILY_3: 3 * 24 * 60 * 60 * 1000, // 3 jours
      WEEKLY_1: 7 * 24 * 60 * 60 * 1000, // 1 semaine
    };

    return frequencies[frequency] || 24 * 60 * 60 * 1000; // default to 1 day
  }

  /**
   * Force l'envoi immédiat des relances (pour les tests)
   */
  async forceSendReminders() {
    console.log("🔄 Envoi forcé des relances...");
    await this.checkAndSendReminders();
  }

  /**
   * Envoie les invitations à tous les évaluateurs en attente (sans mail envoyé) d'une évaluation
   * @param evaluationId - L'ID de l'évaluation
   */
  async sendPendingEvaluatorInvitations(evaluationId: number) {
    try {
      console.log(`📨 Envoi des invitations aux évaluateurs en attente pour l'évaluation ${evaluationId}...`);

      // Récupérer tous les évaluateurs qui n'ont pas encore reçu de mail
      const pendingEvaluators = await prisma.evaluationParticipant.findMany({
        where: {
          evaluationId,
          participantRole: "EVALUATOR",
          mailSentAt: null,
        },
        include: {
          user: true,
          evaluation: {
            include: {
              participants: {
                where: {
                  participantRole: "CANDIDAT",
                },
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      console.log(`📧 ${pendingEvaluators.length} évaluateur(s) en attente d'invitation`);

      let sentCount = 0;
      for (const evaluator of pendingEvaluators) {
        try {
          await this.sendImmediateNotification(evaluator.id);
          sentCount++;
        } catch (error) {
          console.error(`❌ Erreur lors de l'envoi à l'évaluateur ${evaluator.id}:`, error);
        }
      }

      console.log(`✅ ${sentCount}/${pendingEvaluators.length} invitation(s) envoyée(s) aux évaluateurs`);
      return sentCount;
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi des invitations aux évaluateurs en attente:", error);
      throw error;
    }
  }

  /**
   * Envoie immédiatement une notification à un participant qui n'a jamais reçu de mail
   * @param participantId - L'ID du participant
   */
  async sendImmediateNotification(participantId: number) {
    try {
      console.log(`📨 Envoi immédiat de notification pour le participant ${participantId}...`);

      // Récupérer le participant avec ses informations complètes
      const participant = await prisma.evaluationParticipant.findUnique({
        where: {
          id: participantId,
        },
        include: {
          user: true,
          evaluation: {
            include: {
              participants: {
                where: {
                  participantRole: "CANDIDAT",
                },
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (!participant) {
        console.log(`⚠️  Participant ${participantId} introuvable`);
        return;
      }

      // Ne pas envoyer si le participant a déjà reçu un mail
      if (participant.mailSentAt) {
        console.log(`⚠️  Le participant ${participant.user.email} a déjà reçu un mail`);
        return;
      }

      // Ne pas envoyer si l'évaluation est complétée
      if (participant.evaluation.isCompleted) {
        console.log(`⚠️  L'évaluation ${participant.evaluation.ref} est déjà complétée`);
        return;
      }

      // Ne pas envoyer si la deadline est dépassée
      const now = new Date();
      if (participant.evaluation.deadline < now) {
        console.log(`⚠️  La deadline de l'évaluation ${participant.evaluation.ref} est dépassée`);
        return;
      }

      if (!participant.user.email) {
        console.log(`⚠️  Aucun email pour le participant ${participant.user.name}`);
        return;
      }

      console.log(`📤 Préparation de l'envoi immédiat pour ${participant.user.email}...`);

      // Trouver le candidat pour le contexte de l'email
      const candidat = participant.evaluation.participants.find(
        (p: any) => p.participantRole === "CANDIDAT"
      );
      
      const candidatName = candidat?.user.name || participant.user.name;

      // Préparer les informations pour le mail d'invitation
      const deadline = participant.evaluation.deadline;
      const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString('fr-FR') : "la date limite";

      // Générer mot de passe temporaire si première connexion
      let temporaryPassword = "";
      if (participant.user.isFirstLogin) {
        temporaryPassword = await generateTemporaryPassword(participant.user.id);
      }

      const loginInstructions = getLoginInstructions(
        participant.user.email,
        participant.user.isFirstLogin,
        temporaryPassword
      );

      // Obtenir le contenu de l'email selon le rôle
      const emailContent = this.getEmailContent(
        participant.user.name,
        participant.participantRole,
        candidatName,
        participant.evaluation.ref,
        formattedDeadline,
        loginInstructions
      );

      await sendEmail({
        to: participant.user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      // Marquer le mail comme envoyé et incrémenter le compteur
      await prisma.evaluationParticipant.update({
        where: { id: participant.id },
        data: {
          mailSentAt: new Date(),
          reminderCount: 1,
        },
      });

      console.log(`✅ Email immédiat envoyé avec succès à ${participant.user.email}`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi immédiat de notification:`, error);
      throw error;
    }
  }
}

// Instance singleton
export const reminderService = new ReminderService();
