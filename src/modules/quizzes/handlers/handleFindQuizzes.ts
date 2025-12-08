import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma, sendInternalError } from "../../../utils";

export const handleFindQuizzes = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        deletedAt: null // Exclude soft-deleted quizzes
      },
      include: { questions: { include: { options: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return reply.status(200).send({ quizzes });
  } catch (error: any) {
    return sendInternalError(reply, 'Erreur lors de la récupération des quizzes', error);
  }
};

export default handleFindQuizzes;
