import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindEvaluations = async (
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>,
  reply: FastifyReply
) => {
  try {
    // keep compatibility with possible authenticated payload
    const userPayload = (request as any).user;

    const q = request.query;

    // Parse pagination params: default limit = 10, page = 1
    let page = q && q.page ? parseInt(String(q.page), 10) : 1;
    let limit = q && q.limit ? parseInt(String(q.limit), 10) : 10;

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const skip = (page - 1) * limit;

    // Total count for pagination metadata
    const total = await prisma.evaluation.count();

    const evaluations = await prisma.evaluation.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return reply.status(200).send({
      evaluations,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération des évaluations:", error);
    return reply.status(500).send({
      error: "Erreur interne du serveur",
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
};
