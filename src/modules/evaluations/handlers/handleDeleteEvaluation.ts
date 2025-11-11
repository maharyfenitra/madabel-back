import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleDeleteEvaluation = async (
  request: FastifyRequest<{ Params: { id?: string }; Querystring: { id?: string }; Body?: { id?: number } }>,
  reply: FastifyReply
) => {
  try {
    // Accepter l'ID soit via params, soit via query, soit via body
    const id = request.params.id || request.query.id || (request.body?.id ? String(request.body.id) : null);

    if (!id) {
      return reply.status(400).send({ error: "ID d'évaluation manquant" });
    }

    const evaluationId = parseInt(id, 10);

    if (isNaN(evaluationId)) {
      return reply.status(400).send({ error: "ID d'évaluation invalide" });
    }

    // Vérifier si l'évaluation existe
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        participants: true,
      },
    });

    if (!evaluation) {
      return reply.status(404).send({ error: "Évaluation non trouvée" });
    }

    // Supprimer l'évaluation avec ses participants et réponses associées
    // Utiliser une transaction pour s'assurer que tout est supprimé proprement
    await prisma.$transaction(async (tx) => {
      // 1. Supprimer les participants (ce qui supprimera automatiquement les réponses en cascade)
      await tx.evaluationParticipant.deleteMany({
        where: { evaluationId: evaluationId },
      });

      // 2. Supprimer l'évaluation elle-même
      await tx.evaluation.delete({
        where: { id: evaluationId },
      });
    });

    return reply.status(200).send({
      message: "Évaluation supprimée avec succès",
      deletedEvaluationId: evaluationId,
    });
  } catch (error: any) {
    console.error("Erreur lors de la suppression de l'évaluation:", error);
    return reply.status(500).send({
      error: "Erreur interne du serveur",
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
};

export default handleDeleteEvaluation;