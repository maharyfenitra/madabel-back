import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { getAuthenticatedUser, isAdmin } from "../../../utils/helpers/auth";
import { sendUnauthorized, sendError } from "../../../utils/helpers/errorHandler";

export const handleGetConfig = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Vérifier l'authentification et le rôle admin
    const user = await getAuthenticatedUser(request);
    if (!user) return sendUnauthorized(reply);
    
    if (!isAdmin(user)) {
      return sendUnauthorized(reply, "Accès réservé aux administrateurs");
    }

    // Récupérer ou créer la configuration
    let config = await prisma.systemConfig.findFirst();
    
    if (!config) {
      // Créer une configuration par défaut si elle n'existe pas
      config = await prisma.systemConfig.create({
        data: {
          reminderFrequency: "DAILY_1",
          reminderEnabled: true,
        },
      });
    }

    return reply.send(config);
  } catch (error: any) {
    console.error("Erreur lors de la récupération de la configuration:", error);
    return sendError(reply, error, "Erreur lors de la récupération de la configuration");
  }
};
