import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { getAuthenticatedUser, isAdmin } from "../../../utils/helpers/auth";
import { sendUnauthorized, sendError, sendBadRequest } from "../../../utils/helpers/errorHandler";

interface UpdateConfigBody {
  reminderFrequency?: string;
  reminderEnabled?: boolean;
}

export const handleUpdateConfig = async (
  request: FastifyRequest<{ Body: UpdateConfigBody }>,
  reply: FastifyReply
) => {
  try {
    // Vérifier l'authentification et le rôle admin
    const user = await getAuthenticatedUser(request);
    if (!user) return sendUnauthorized(reply);
    
    if (!isAdmin(user)) {
      return sendUnauthorized(reply, "Accès réservé aux administrateurs");
    }

    const { reminderFrequency, reminderEnabled } = request.body;

    // Validation
    const validFrequencies = ["HOURLY_1", "HOURLY_2", "DAILY_1", "DAILY_3", "WEEKLY_1"];
    if (reminderFrequency && !validFrequencies.includes(reminderFrequency)) {
      return sendBadRequest(reply, "Fréquence de relance invalide");
    }

    // Récupérer ou créer la configuration
    let config = await prisma.systemConfig.findFirst();
    
    if (!config) {
      // Créer si n'existe pas
      config = await prisma.systemConfig.create({
        data: {
          reminderFrequency: reminderFrequency as any || "DAILY_1",
          reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : true,
        },
      });
    } else {
      // Mettre à jour
      config = await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
          ...(reminderFrequency && { reminderFrequency: reminderFrequency as any }),
          ...(reminderEnabled !== undefined && { reminderEnabled }),
        },
      });
    }

    return reply.send({
      message: "Configuration mise à jour avec succès",
      config,
    });
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour de la configuration:", error);
    return sendError(reply, error, "Erreur lors de la mise à jour de la configuration");
  }
};
