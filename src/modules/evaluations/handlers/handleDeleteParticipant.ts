import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleDeleteParticipant = async (
  request: FastifyRequest<{ Params: { id: number}}>,
  reply: FastifyReply
) => {
  try {
   
    const participantId = request.params.id;
    const participant = await prisma.evaluationParticipant.delete({ where: {
        id: Number(participantId)
    }})

    return reply.status(200).send(participant);
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return reply.status(500).send({
      error: "Failed to delete participant",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
