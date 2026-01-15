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
          participantRole: "EVALUATOR",
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

      // Envoyer les emails de relance
      let sentCount = 0;
      for (const participant of incompleteParticipants) {
        try {
          console.log(`🔍 Vérification participant: ${participant.user.name} (${participant.user.email})`);
          
          const candidat = participant.evaluation.participants.find(
            (p: any) => p.participantRole === "CANDIDAT"
          );

          if (!candidat) {
            console.log(`⚠️  Aucun candidat trouvé pour le participant ${participant.user.name}`);
            continue;
          }
          
          if (!participant.user.email) {
            console.log(`⚠️  Aucun email pour le participant ${participant.user.name}`);
            continue;
          }

          console.log(`📤 Préparation de l'envoi pour ${participant.user.email}...`);

          // Préparer les informations pour le mail d'invitation
          const candidatName = candidat.user.name || "la personne concernée";
          const deadline = participant.evaluation.deadline;
          const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString('fr-FR') : "la date limite";
          const subject = `Invitation à l'évaluation ${participant.evaluation.ref}`;

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

          await sendEmail({
            to: participant.user.email,
            subject,
            text,
            html,
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
          participantRole: "EVALUATOR",
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

      // Envoyer les emails de relance
      let sentCount = 0;
      for (const participant of incompleteParticipants) {
        try {
          const candidat = participant.evaluation.participants.find(
            (p: any) => p.participantRole === "CANDIDAT"
          );

          if (!candidat || !participant.user.email) {
            continue;
          }

          // Préparer les informations pour le mail d'invitation
          const candidatName = candidat.user.name || "la personne concernée";
          const deadline = participant.evaluation.deadline;
          const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString('fr-FR') : "la date limite";
          const subject = `Invitation à l'évaluation ${participant.evaluation.ref}`;

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

          await sendEmail({
            to: participant.user.email,
            subject,
            text,
            html,
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
}

// Instance singleton
export const reminderService = new ReminderService();
