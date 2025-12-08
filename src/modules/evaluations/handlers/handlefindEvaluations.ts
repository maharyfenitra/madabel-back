import type { FastifyReply, FastifyRequest } from "fastify";
import { 
  prisma, 
  parsePaginationParams, 
  createPaginatedResponse,
  enrichEvaluationsData,
  sendInternalError 
} from "../../../utils";

export const handleFindEvaluations = async (
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>,
  reply: FastifyReply
) => {
  try {
    // Parse and validate pagination parameters
    const { page, limit, skip } = parsePaginationParams(request.query);

    // Fetch total count and evaluations in parallel
    const [total, evaluations] = await Promise.all([
      prisma.evaluation.count(),
      prisma.evaluation.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          participants: {
            select: {
              participantRole: true,
              completedAt: true,
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
      }),
    ]);

    // Enrich evaluations with progress data
    const enrichedEvaluations = enrichEvaluationsData(evaluations);

    // Return paginated response
    return reply.status(200).send(
      createPaginatedResponse(enrichedEvaluations, total, page, limit, 'evaluations')
    );
  } catch (error: any) {
    return sendInternalError(reply, "Erreur lors de la récupération des évaluations", error);
  }
};
