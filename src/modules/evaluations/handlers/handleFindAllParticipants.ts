import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma, parseId, sendBadRequest, sendInternalError } from "../../../utils";

export const handleFindAllParticipants = async (
  request: FastifyRequest<{Params: { id : number}}>,
  reply: FastifyReply
) => {
  try {
    const params = request.params;
    const evaluationId = parseId(params.id);

    if (!evaluationId) {
      return sendBadRequest(reply, "ID d'évaluation invalide");
    }

    const participants = await prisma.evaluationParticipant.findMany({
      where: {
        evaluationId: evaluationId
      },
      select: {
        id: true,
        evaluationId: true,
        participantRole: true,
        evaluatorType: true,
        mailSentAt: true,
        reminderSentAt: true,
        reminderCount: true,
        completedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            post: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return reply.status(200).send(participants);
  } catch (error) {
    return sendInternalError(reply, "Erreur lors de la récupération des participants", error);
  }
};