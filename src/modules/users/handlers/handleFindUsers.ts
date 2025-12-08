import type { FastifyReply, FastifyRequest } from "fastify";
import { 
  prisma, 
  parsePaginationParams, 
  createPaginatedResponse,
  sendInternalError 
} from "../../../utils";

export const handleFindUsers = async (
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>,
  reply: FastifyReply
) => {
  try {
    // Parse and validate pagination parameters
    const { page, limit, skip } = parsePaginationParams(request.query);

    // Fetch total count and users in parallel (exclude soft-deleted users)
    const whereClause = { deletedAt: null };
    
    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    // Return paginated response
    return reply.status(200).send(
      createPaginatedResponse(users, total, page, limit, 'users')
    );
  } catch (error: any) {
    return sendInternalError(reply, "Erreur lors de la récupération des utilisateurs", error);
  }
};
