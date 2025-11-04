import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindQuizById = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'ID invalide' });

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: { include: { options: true } } }
    });

    if (!quiz) return reply.status(404).send({ error: 'Quiz non trouvé' });

    return reply.status(200).send({ quiz });
  } catch (error: any) {
    console.error("❌ Erreur findQuizById:", error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleFindQuizById;
