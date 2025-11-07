import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindCandidateEvaluations = async (
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }> ,
  reply: FastifyReply
) => {
  try {
    const q = request.query;

    // pagination defaults
    let page = q && q.page ? parseInt(String(q.page), 10) : 1;
    let limit = q && q.limit ? parseInt(String(q.limit), 10) : 10;
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    const skip = (page - 1) * limit;

    // The verifyJWT preHandler should set request.user = { userId }
    const userPayload = (request as any).user;
    if (!userPayload || !userPayload.userId) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const userId = Number(userPayload.userId);

    // Count and fetch evaluations where this user is a participant
    const whereClause = {
      participants: {
        some: {
          userId: userId,
        },
      },
    };

    const total = await prisma.evaluation.count({ where: whereClause });

    const evaluations = await prisma.evaluation.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        participants: {
          select: {
            id: true,
            participantRole: true,
            user: {
              select: {
                id: true,
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

    // Attach the current participant id for convenience on the frontend
    const evaluationsWithParticipantId = evaluations.map((ev: any) => {
      const currentPart = (ev.participants || []).find((p: any) => p.user && p.user.id === userId);
      return { ...ev, currentParticipantId: currentPart ? currentPart.id : null };
    });

    return reply.status(200).send({
      evaluations: evaluationsWithParticipantId,
      meta: { total, page, limit, totalPages },
    });
  } catch (error: any) {
    console.error("Error fetching candidate evaluations:", error);
    return reply.status(500).send({ error: "Internal server error" });
  }
};

export default handleFindCandidateEvaluations;
