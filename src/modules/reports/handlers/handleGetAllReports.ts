import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export async function handleGetAllReports(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const user = (request as any)?.user as { userId: number; role: string };

    if (!user) {
      return reply.status(401).send({ error: "Utilisateur non authentifié" });
    }

    const page = parseInt(request.query.page || "1", 10);
    const limit = parseInt(request.query.limit || "10", 10);
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // Filtrer selon le rôle
    if (user.role === "ADMIN") {
      // ADMIN voit toutes les évaluations
      whereClause = {};
    } else if (user.role === "CANDIDAT") {
      // CANDIDAT voit les évaluations où il est candidat ET qui ont au moins un évaluateur ayant complété
      whereClause = {
        AND: [
          {
            participants: {
              some: {
                userId: user.userId,
                participantRole: "CANDIDAT",
              },
            },
          },
          {
            // Au moins un évaluateur a complété son évaluation
            participants: {
              some: {
                participantRole: "EVALUATOR",
                completedAt: { not: null },
              },
            },
          },
        ],
      };
    } else if (user.role === "EVALUATOR") {
      // EVALUATOR voit les évaluations auxquelles il a participé ET qu'il a complétées
      whereClause = {
        participants: {
          some: {
            userId: user.userId,
            participantRole: "EVALUATOR",
            completedAt: { not: null },
          },
        },
      };
    }

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

    // Enrichir les données avec des informations utiles
    const enrichedEvaluations = evaluations.map((evaluation) => {
      const candidat = evaluation.participants.find(
        (p) => p.participantRole === "CANDIDAT"
      );
      const evaluators = evaluation.participants.filter(
        (p) => p.participantRole === "EVALUATOR"
      );
      
      // Compter les évaluateurs qui ont complété
      const completedEvaluators = evaluators.filter(
        (e) => e.completedAt !== null
      ).length;

      return {
        id: evaluation.id,
        ref: evaluation.ref,
        deadline: evaluation.deadline,
        createdAt: evaluation.createdAt,
        isCompleted: evaluation.isCompleted,
        candidat: candidat ? {
          id: candidat.user.id,
          name: candidat.user.name,
          email: candidat.user.email,
        } : null,
        evaluatorsCount: evaluators.length,
        completedEvaluators,
        quiz: evaluation.quiz,
        participants: evaluation.participants,
      };
    });

    return reply.send({
      evaluations: enrichedEvaluations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des rapports:", error);
    return reply.status(500).send({
      error: "Erreur interne du serveur",
    });
  }
}
