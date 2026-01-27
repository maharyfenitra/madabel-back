import type { FastifyReply, FastifyRequest } from "fastify";
import { 
  prisma, 
  parsePaginationParams, 
  createPaginationMeta,
  getAuthenticatedUser,
  sendUnauthorized,
  sendInternalError,
  getCandidatFromParticipants,
  calculateEvaluationProgress
} from "../../../utils";

export async function handleGetAllReports(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string };
  }>,
  reply: FastifyReply
) {
  try {
    // Verify authentication
    const user = getAuthenticatedUser(request);
    if (!user) {
      return sendUnauthorized(reply);
    }

    // Parse pagination parameters
    const { page, limit, skip } = parsePaginationParams(request.query);

    // Build where clause based on user role
    // Seuls les ADMIN ont accès aux rapports
    if (user.role !== "ADMIN") {
      return reply.status(403).send({
        error: "Accès refusé. Seuls les administrateurs peuvent consulter les rapports.",
      });
    }

    let whereClause: any = {};
    whereClause = {};

    // Fetch evaluations and total count in parallel
    const [evaluations, total] = await Promise.all([
      prisma.evaluation.findMany({
        where: whereClause,
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.evaluation.count({ where: whereClause }),
    ]);

    // Enrich evaluations with progress and candidat information
    const enrichedEvaluations = evaluations.map((evaluation) => {
      const candidat = getCandidatFromParticipants(evaluation.participants);
      const progress = calculateEvaluationProgress(evaluation.participants);

      return {
        id: evaluation.id,
        ref: evaluation.ref,
        deadline: evaluation.deadline,
        createdAt: evaluation.createdAt,
        isCompleted: evaluation.isCompleted,
        candidat,
        ...progress,
        quiz: evaluation.quiz,
        participants: evaluation.participants,
      };
    });

    // Return response with pagination metadata
    return reply.send({
      evaluations: enrichedEvaluations,
      meta: createPaginationMeta(total, page, limit),
    });
  } catch (error) {
    return sendInternalError(reply, "Erreur lors de la récupération des rapports", error);
  }
}
