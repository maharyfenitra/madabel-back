import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleCreateQuestion = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const quizId = parseInt(params.quizId, 10);
    if (Number.isNaN(quizId)) return reply.status(400).send({ error: 'quizId invalide' });

    const body = req.body as any;
    if (!body.text) return reply.status(400).send({ error: 'Le texte de la question est requis' });

    const data: any = {
      quizId,
      text: String(body.text),
      type: body.type || 'SINGLE_CHOICE',
      category: body.category || 'SUMMIT',
      order: typeof body.order === 'number' ? body.order : 0,
      weight: typeof body.weight === 'number' ? body.weight : undefined,
      language: body.language || 'fr',
    };

    if (Array.isArray(body.options) && body.options.length > 0) {
      data.options = { create: body.options.map((o: any) => ({ text: String(o.text), value: typeof o.value === 'number' ? o.value : undefined, isKey: typeof o.isKey === 'boolean' ? o.isKey : undefined })) };
    }

    const question = await prisma.question.create({ data, include: { options: true } });

    return reply.status(201).send({ question });
  } catch (error: any) {
    console.error("❌ Erreur createQuestion:", error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleCreateQuestion;
