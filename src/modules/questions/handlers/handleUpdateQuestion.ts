import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleUpdateQuestion = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) return reply.status(400).send({ error: 'ID invalide' });

    const body = req.body as any;
    const data: any = {};
    if (typeof body.text !== 'undefined') data.text = String(body.text);
    if (typeof body.type !== 'undefined') data.type = body.type;
    if (typeof body.category !== 'undefined') data.category = body.category;
    if (typeof body.order !== 'undefined') data.order = Number(body.order);
    if (typeof body.weight !== 'undefined') data.weight = typeof body.weight === 'number' ? body.weight : undefined;
    if (typeof body.language !== 'undefined') data.language = body.language;

    // Si des options sont fournies, on remplace les options existantes par les nouvelles
    if (Array.isArray(body.options)) {
      await prisma.option.deleteMany({ where: { questionId: id } });
      if (body.options.length > 0) {
        data.options = { create: body.options.map((o: any) => ({ text: String(o.text), value: typeof o.value === 'number' ? o.value : undefined, isKey: typeof o.isKey === 'boolean' ? o.isKey : undefined })) };
      }
    }

    const question = await prisma.question.update({ where: { id }, data, include: { options: true } });

    return reply.status(200).send({ question });
  } catch (error: any) {
    console.error("❌ Erreur updateQuestion:", error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleUpdateQuestion;
