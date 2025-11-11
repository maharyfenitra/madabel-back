import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindAllParticipants = async (
  request: FastifyRequest<{Params: { id : number}}>,
  reply: FastifyReply
) => {
  try {
    const params = request.params
    const evaluationId = params.id

     const participants = await prisma.evaluationParticipant.findMany({
        where: {
            evaluationId: Number(evaluationId)
        },
        select: {
            id: true,
            evaluationId: true,
            participantRole: true,
            evaluatorType: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    role: true,
                    post: true,
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    })

    return reply.status(200).send(participants);
  } catch (error) {
    console.error("Error fetching participants:", error);
    return reply.status(500).send({
      error: "Failed to fetch participants",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};