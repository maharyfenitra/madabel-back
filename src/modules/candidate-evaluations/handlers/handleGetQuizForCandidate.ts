import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleGetQuizForCandidate = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const query = req.query as any;
    const quizId = parseInt(params.quizId, 10);
    if (Number.isNaN(quizId)) return reply.status(400).send({ error: 'quizId invalide' });

    // Paramètres de pagination
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 5; // 5 questions par page par défaut
    const offset = (page - 1) * limit;

    if (page < 1 || limit < 1) {
      return reply.status(400).send({ error: 'Paramètres de pagination invalides' });
    }

    // Récupérer le quiz avec le nombre total de questions
    const quiz = await prisma.quiz.findUnique({
      where: { 
        id: quizId,
        deletedAt: null // Exclure les quizzes supprimés (soft delete)
      },
      include: {
        questions: {
          include: { options: true },
          skip: offset,
          take: limit,
          orderBy: [
            { order: 'asc' },
            { id: 'asc' }
          ]
        },
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!quiz) return reply.status(404).send({ error: 'Quiz non trouvé' });

    // Calculer les informations de pagination
    const totalQuestions = quiz._count.questions;
    const totalPages = Math.ceil(totalQuestions / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Préparer la réponse avec pagination
    const response = {
      quiz: {
        ...quiz,
        questions: quiz.questions,
        pagination: {
          currentPage: page,
          totalPages,
          totalQuestions,
          questionsPerPage: limit,
          hasNextPage,
          hasPreviousPage
        }
      }
    };

    return reply.status(200).send(response);
  } catch (error: any) {
    console.error('Erreur get quiz for candidate:', error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleGetQuizForCandidate;
