import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindQuizzes = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        deletedAt: null // Exclure les quizzes supprimés (soft delete)
      },
      include: { questions: { include: { options: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return reply.status(200).send({ quizzes });
  } catch (error: any) {
    console.error("❌ Erreur récupération quizzes:", error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleFindQuizzes;
