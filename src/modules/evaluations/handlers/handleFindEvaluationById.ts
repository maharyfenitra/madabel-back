import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindEvaluationById = async (
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply
) => {
  try {
    const evaluationId = request.params.id;
    const evaluation = await prisma.evaluation.findUnique({
      where: {
        id: Number(evaluationId),
      },
      include: {
        participants: {
          select: {
            participantRole: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return reply.status(200).send(evaluation);
  } catch (err) {
    return reply.status(200).send(err);
  }
};
