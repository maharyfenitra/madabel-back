import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleDeleteQuiz = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const idParam = params.id || (req.body as any).id;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'ID invalide' });

    // Soft delete : marquer comme supprimé au lieu de supprimer physiquement
    const quiz = await prisma.quiz.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return reply.status(200).send({ quiz });
  } catch (error: any) {
    console.error("❌ Erreur deleteQuiz:", error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleDeleteQuiz;
