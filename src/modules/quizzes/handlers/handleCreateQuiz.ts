import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleCreateQuiz = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const body = req.body as Record<string, any>;

    const title = body.title;
    const description = body.description;
    const isActive = body.isActive ?? true;
    const questions = Array.isArray(body.questions) ? body.questions : [];

    if (!title) {
      return reply.status(400).send({ error: "Le titre du quiz est requis" });
    }

    const data: any = {
      title: String(title),
      description: description ? String(description) : undefined,
      isActive: Boolean(isActive),
    };

    if (questions.length > 0) {
      data.questions = {
        create: questions.map((q: any) => {
          const qData: any = {
            text: String(q.text),
            type: q.type || "SINGLE_CHOICE",
            order: typeof q.order === "number" ? q.order : 0,
            weight: typeof q.weight === "number" ? q.weight : undefined,
            language: q.language || "fr",
          };

          if (Array.isArray(q.options) && q.options.length > 0) {
            qData.options = {
              create: q.options.map((o: any) => ({
                text: String(o.text),
                value: typeof o.value === "number" ? o.value : undefined,
                isKey: typeof o.isKey === "boolean" ? o.isKey : undefined,
              })),
            };
          }

          return qData;
        }),
      };
    }

    const quiz = await prisma.quiz.create({
      data,
      include: { questions: { include: { options: true } } },
    });

    return reply.status(201).send({ quiz });
  } catch (error: any) {
    console.error("❌ Erreur création quiz:", error);
    return reply
      .status(500)
      .send({ error: "Erreur interne", details: error.message });
  }
};

export default handleCreateQuiz;
