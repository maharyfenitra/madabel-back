import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleCreateEvaluation = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const userPayload = (request as any).user;
  const body = request.body as Record<string, any>;

  console.log("📥 Champs reçus:", Object.keys(body));

  // Récupérer les champs texte correctement
  const ref = body.ref?.value || body.ref;
  const createdAt = body.createdAt?.value || body.createdAt;
  const deadline = body.deadline?.value || body.deadline;
  const completedAt = body.completedAt?.value || body.completedAt;

  // Convert date strings to Date objects or ISO strings
  const parseDate = (dateString: string | undefined): Date | null => {
    if (!dateString) return null;
    
    // If it's already a Date object or ISO string with time, use as is
    if (dateString as any instanceof Date || dateString.includes('T')) {
      return new Date(dateString);
    }
    
    // If it's just a date string like "2025-10-31", add time component
    return new Date(dateString + 'T00:00:00.000Z');
  };

  try {
    const evaluation = await prisma.evaluation.create({
      data: {
        ref,
        completedAt: parseDate(completedAt),
        deadline: parseDate(deadline)!,
        createdAt: parseDate(createdAt) || new Date(), // Default to now if not provided
      },
    });

    return reply.status(200).send(evaluation);
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return reply.status(500).send({ 
      error: "Failed to create evaluation",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};