import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleGetQuizForCandidate = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const query = req.query as any;
    const quizId = parseInt(params.quizId, 10);
    const participantIdRaw = parseInt(query.participantId, 10);
    const participantId = !isNaN(participantIdRaw) && participantIdRaw > 0 ? participantIdRaw : null;
    if (Number.isNaN(quizId)) return reply.status(400).send({ error: 'quizId invalide' });

    // Paramètres de pagination
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 5; // 5 questions par page par défaut
    const offset = (page - 1) * limit;

    if (page < 1 || limit < 1) {
      return reply.status(400).send({ error: 'Paramètres de pagination invalides' });
    }

    // Récupérer le quiz avec TOUTES les questions (sans pagination au niveau DB)
    const quiz = await prisma.quiz.findUnique({
      where: { 
        id: quizId,
        deletedAt: null // Exclure les quizzes supprimés (soft delete)
      },
      include: {
        questions: {
          include: { options: true },
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

    // Trier les questions : AUTRE à la fin
    const sortedQuestions = quiz.questions.sort((a, b) => {
      // Si a est AUTRE, il doit être après b
      if (a.category === 'AUTRE' && b.category !== 'AUTRE') return 1;
      // Si b est AUTRE, il doit être après a
      if (b.category === 'AUTRE' && a.category !== 'AUTRE') return -1;
      // Sinon, trier par order puis par id
      if (a.order !== b.order) return a.order - b.order;
      return a.id - b.id;
    });

    // Appliquer la pagination sur les questions triées
    const paginatedQuestions = sortedQuestions.slice(offset, offset + limit);

    // Récupérer le(s) nom(s) du/des candidat(s) si participantId est fourni
    let candidateName = null;
    let isCandidate = false;
    if (participantId) {
      const participant = await prisma.evaluationParticipant.findFirst({
        where: { id: participantId },
        include: {
          evaluation: {
            include: {
              participants: {
                where: { participantRole: 'CANDIDAT' },
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Vérifier si le participant actuel est un candidat
      if (participant && participant.participantRole === 'CANDIDAT') {
        isCandidate = true;
      }

      if (participant?.evaluation?.participants && participant.evaluation.participants.length > 0) {
        // Si plusieurs candidats, les joindre avec " et "
        const candidateNames = participant.evaluation.participants
          .map((p: any) => p.user?.name || p.user?.email)
          .filter(Boolean);
        
        if (candidateNames.length === 1) {
          candidateName = candidateNames[0];
        } else if (candidateNames.length > 1) {
          candidateName = candidateNames.join(' et ');
        }
      }
    }

    // Calculer les informations de pagination
    const totalQuestions = quiz._count.questions;
    const totalPages = Math.ceil(totalQuestions / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Préparer la réponse avec pagination
    const response = {
      quiz: {
        ...quiz,
        questions: paginatedQuestions,
        candidateName,
        isCandidate,
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
