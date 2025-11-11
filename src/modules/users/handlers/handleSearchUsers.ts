import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleSearchUsers = async (
  request: FastifyRequest<{ Querystring: { q: string; page?: string; limit?: string } }>,
  reply: FastifyReply
) => {
  try {
    const userPayload = (request as any).user;
    const { q, page, limit } = request.query;

    if (!q || q.trim().length === 0) {
      return reply.status(400).send({
        error: "Le paramètre de recherche 'q' est requis et ne peut pas être vide",
      });
    }

    // Parse pagination params: default limit = 10, page = 1
    let pageNum = page ? parseInt(String(page), 10) : 1;
    let limitNum = limit ? parseInt(String(limit), 10) : 10;

    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;

    // Cap limit to avoid heavy queries
    const MAX_LIMIT = 100;
    if (limitNum > MAX_LIMIT) limitNum = MAX_LIMIT;

    const skip = (pageNum - 1) * limitNum;

    // Build search condition
    const searchCondition = {
      AND: [
        { deletedAt: null }, // Exclude soft-deleted users
        {
          OR: [
            {
              name: {
                contains: q,
                mode: 'insensitive' as const,
              },
            },
            {
              email: {
                contains: q,
                mode: 'insensitive' as const,
              },
            },
          ],
        },
      ],
    };

    // Total count for pagination metadata
    const total = await prisma.user.count({ where: searchCondition });

    const users = await prisma.user.findMany({
      where: searchCondition,
      skip,
      take: limitNum,
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
    });

    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    return reply.status(200).send({
      users,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        query: q,
      },
    });
  } catch (error: any) {
    console.error("❌ Erreur lors de la recherche d'utilisateurs:", error);
    return reply.status(500).send({
      error: "Erreur interne du serveur",
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
};