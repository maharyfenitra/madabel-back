import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleUpdateQuiz = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const idParam = params.id || (req.body as any).id;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'ID invalide' });

    const body = req.body as any;

    const data: any = {};
    if (typeof body.title !== 'undefined') data.title = String(body.title);
    if (typeof body.description !== 'undefined') data.description = body.description === null ? null : String(body.description);
    if (typeof body.isActive !== 'undefined') data.isActive = Boolean(body.isActive);

    const quiz = await prisma.quiz.update({
      where: { 
        id,
        deletedAt: null // Ne permettre la mise à jour que des quizzes non supprimés
      },
      data,
      include: { questions: { include: { options: true } } }
    });

    return reply.status(200).send({ quiz });
  } catch (error: any) {
    console.error("❌ Erreur updateQuiz:", error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleUpdateQuiz;
