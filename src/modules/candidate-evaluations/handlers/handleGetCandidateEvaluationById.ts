import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleGetCandidateEvaluationById = async (
  request: FastifyRequest<{ Params: { evaluationId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { evaluationId } = request.params;
    const user = (request as any)?.user as { userId: number; role: string };

    if (!user) {
      return reply.status(401).send({ error: "Utilisateur non authentifié" });
    }

    // Vérifier que l'utilisateur est bien un participant de cette évaluation
    const evaluationParticipant = await prisma.evaluationParticipant.findFirst({
      where: {
        evaluationId: parseInt(evaluationId),
        userId: user.userId,
      },
    });

    if (!evaluationParticipant) {
      return reply.status(403).send({
        error: "Vous n'êtes pas autorisé à accéder à cette évaluation",
      });
    }

    // Récupérer l'évaluation avec les participants
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: parseInt(evaluationId) },
      include: {
        participants: {
          select: {
            id: true,
            participantRole: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!evaluation) {
      return reply.status(404).send({ error: "Évaluation non trouvée" });
    }

    return reply.send({
      evaluation: {
        ...evaluation,
        currentParticipantId: evaluationParticipant.id,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'évaluation:", error);
    return reply.status(500).send({
      error: "Erreur interne du serveur",
    });
  }
};