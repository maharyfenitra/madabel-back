import { prisma } from "../../utils";
import { sendEmail } from "../../utils/services/emailService";
import { createEvaluationReminderEmail } from "../../utils/services/reminderEmail";

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

    // Vérifier immédiatement au démarrage
    await this.checkAndSendReminders();

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

          const emailContent = createEvaluationReminderEmail(
            participant.user.name,
            candidat.user.name,
            participant.evaluation.ref,
            participant.evaluation.id
          );

          await sendEmail({
            to: participant.user.email,
            subject: emailContent.subject,
            html: emailContent.html,
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
