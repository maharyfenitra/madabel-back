import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindEvaluators = async (
  request: FastifyRequest<{Params: { id : number}}>,
  reply: FastifyReply
) => {
  try {
    const params = request.params
    const evaluationId = params.id

     const evaluators = await prisma.evaluationParticipant.findMany({ where: {
        evaluationId: Number(evaluationId),
        participantRole: "EVALUATOR"
     },
      select: {
            id: true,
            evaluationId: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    role: true,
                }
            }
        }
    })

    return reply.status(200).send(evaluators);
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return reply.status(500).send({
      error: "Failed to create evaluation",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
