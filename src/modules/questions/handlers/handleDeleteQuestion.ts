import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleDeleteQuestion = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'ID invalide' });

    await prisma.option.deleteMany({ where: { questionId: id } });
    const question = await prisma.question.delete({ where: { id } });

    return reply.status(200).send({ question });
  } catch (error: any) {
    console.error("❌ Erreur deleteQuestion:", error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleDeleteQuestion;
