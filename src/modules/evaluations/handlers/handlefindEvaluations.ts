import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindEvaluations = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
 
  const evaluations = await prisma.evaluation.findMany({
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

  return reply.status(200).send(evaluations);
};
