import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleGetQuizForCandidate = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const quizId = parseInt(params.quizId, 10);
    if (Number.isNaN(quizId)) return reply.status(400).send({ error: 'quizId invalide' });

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { options: true } } }
    });

    if (!quiz) return reply.status(404).send({ error: 'Quiz non trouvé' });

    return reply.status(200).send({ quiz });
  } catch (error: any) {
    console.error('Erreur get quiz for candidate:', error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleGetQuizForCandidate;
