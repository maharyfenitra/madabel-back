import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindQuestions = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const quizId = parseInt(params.quizId, 10);
    if (Number.isNaN(quizId)) return reply.status(400).send({ error: 'quizId invalide' });

    const questions = await prisma.question.findMany({ 
      where: { quizId }, 
      include: { options: true }, 
      orderBy: [
        { order: 'asc' },
        { id: 'asc' }
      ]
    });

    return reply.status(200).send({ questions });
  } catch (error: any) {
    console.error("❌ Erreur findQuestions:", error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleFindQuestions;
