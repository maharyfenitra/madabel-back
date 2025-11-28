import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export async function handleGetEvaluationReport(
  request: FastifyRequest<{
    Params: { evaluationId: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { evaluationId } = request.params;
    const user = (request as any)?.user as { userId: number; role: string };

    if (!user) {
      return reply.status(401).send({ error: "Utilisateur non authentifié" });
    }

    console.log("User accessing report:", { userId: user.userId, role: user.role, evaluationId });

    // Vérifier que l'utilisateur a accès à ce rapport
    // - ADMIN : accès à tous les rapports
    // - CANDIDAT : accès aux rapports où il est le candidat évalué ET où au moins un évaluateur a complété
    // - EVALUATOR : accès aux rapports des évaluations qu'il a complétées
    
    if (user.role !== "ADMIN") {
      // Vérifier si l'utilisateur est participant
      const userParticipants = await prisma.evaluationParticipant.findMany({
        where: {
          evaluationId: parseInt(evaluationId),
          userId: user.userId,
        },
      });

      if (userParticipants.length === 0) {
        return reply.status(403).send({
          error: "Vous n'êtes pas autorisé à accéder à ce rapport",
        });
      }

      // Vérifier les conditions selon le rôle de participation
      let hasAccess = false;

      for (const participant of userParticipants) {
        // Si c'est un évaluateur ET qu'il a complété, il a accès
        if (participant.participantRole === "EVALUATOR" && participant.completedAt) {
          hasAccess = true;
          break;
        }

        // Si c'est un candidat, vérifier qu'au moins un évaluateur a complété
        if (participant.participantRole === "CANDIDAT") {
          const completedEvaluators = await prisma.evaluationParticipant.count({
            where: {
              evaluationId: parseInt(evaluationId),
              participantRole: "EVALUATOR",
              completedAt: { not: null },
            },
          });

          if (completedEvaluators > 0) {
            hasAccess = true;
            break;
          }
        }
      }

      if (!hasAccess) {
        // Déterminer le message d'erreur approprié
        const isEvaluator = userParticipants.some(p => p.participantRole === "EVALUATOR");
        const isCandidat = userParticipants.some(p => p.participantRole === "CANDIDAT");

        if (isEvaluator && userParticipants.every(p => !p.completedAt)) {
          return reply.status(403).send({
            error: "Vous devez compléter votre évaluation avant de voir le rapport",
          });
        }

        if (isCandidat) {
          return reply.status(403).send({
            error: "Aucun évaluateur n'a encore complété cette évaluation",
          });
        }

        return reply.status(403).send({
          error: "Vous n'êtes pas autorisé à accéder à ce rapport",
        });
      }
    }

    // Récupérer l'évaluation avec le quiz et les questions
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: parseInt(evaluationId) },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true,
              },
              orderBy: { order: "asc" },
            },
          },
        },
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
            answers: {
              include: {
                question: true,
                selectedOption: true,
                selectedOptions: {
                  include: { option: true },
                },
              },
            },
          },
        },
      },
    });

    if (!evaluation || !evaluation.quiz) {
      return reply.status(404).send({ error: "Évaluation ou quiz non trouvé" });
    }

    // Grouper les réponses par question et catégorie
    const reportData: Record<string, any> = {};

    // Filtrer uniquement les évaluateurs pour le calcul des moyennes
    const evaluators = evaluation.participants.filter(
      (p) => p.participantRole === "EVALUATOR"
    );

    // Pour chaque question du quiz
    for (const question of evaluation.quiz.questions) {
      const category = question.category;

      if (!reportData[category]) {
        reportData[category] = {
          category,
          questions: [],
        };
      }

      // Récupérer toutes les réponses des évaluateurs pour cette question
      const answers = evaluators
        .map((participant) => {
          const answer = participant.answers.find(
            (a) => a.questionId === question.id
          );
          if (!answer) return null;

          return {
            participantId: participant.id,
            evaluatorType: participant.evaluatorType,
            answer: answer,
          };
        })
        .filter(Boolean);

      // Calculer les moyennes
      const validAnswers = answers.filter((a) => {
        if (question.type === "SCALE" && a!.answer.numericAnswer !== null) {
          return true;
        }
        if (question.type === "SINGLE_CHOICE" && a!.answer.selectedOption) {
          return true;
        }
        return false;
      });

      if (validAnswers.length === 0) {
        reportData[category].questions.push({
          questionId: question.id,
          questionText: question.text,
          questionType: question.type,
          overallAverage: null,
          averagesByEvaluatorType: {},
          totalEvaluators: 0,
          answeredEvaluators: 0,
        });
        continue;
      }

      // Moyenne générale
      let overallSum = 0;
      let overallCount = 0;

      // Moyennes par type d'évaluateur
      const averagesByType: Record<string, { sum: number; count: number }> = {};

      for (const answerData of validAnswers) {
        let value: number | null = null;

        if (question.type === "SCALE") {
          value = answerData?.answer?.numericAnswer || null;
        } else if (question.type === "SINGLE_CHOICE" && answerData?.answer.selectedOption) {
          value = answerData.answer.selectedOption.value || 0;
        }

        if (value !== null) {
          overallSum += value;
          overallCount++;

          const evaluatorType = answerData?.evaluatorType || "OTHER";
          if (!averagesByType[evaluatorType]) {
            averagesByType[evaluatorType] = { sum: 0, count: 0 };
          }
          averagesByType[evaluatorType].sum += value;
          averagesByType[evaluatorType].count++;
        }
      }

      const overallAverage = overallCount > 0 ? overallSum / overallCount : null;

      const averagesByEvaluatorType: Record<string, number> = {};
      for (const [type, data] of Object.entries(averagesByType)) {
        averagesByEvaluatorType[type] = data.count > 0 ? data.sum / data.count : 0;
      }

      reportData[category].questions.push({
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        overallAverage: overallAverage ? Number(overallAverage.toFixed(2)) : null,
        averagesByEvaluatorType,
        totalEvaluators: evaluators.length,
        answeredEvaluators: validAnswers.length,
      });
    }

    // Convertir l'objet en tableau pour le retour
    const report = Object.values(reportData);

    return reply.send({
      evaluationId: parseInt(evaluationId),
      evaluationRef: evaluation.ref,
      evaluation: {
        id: evaluation.id,
        ref: evaluation.ref,
        deadline: evaluation.deadline,
        isCompleted: evaluation.isCompleted,
        createdAt: evaluation.createdAt,
        participants: evaluation.participants.map((p) => ({
          id: p.id,
          participantRole: p.participantRole,
          completedAt: p.completedAt,
          evaluatorType: p.evaluatorType,
          user: {
            id: p.user.id,
            name: p.user.name,
            email: p.user.email,
            role: p.user.role,
          },
        })),
      },
      report,
    });
  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error);
    return reply.status(500).send({
      error: "Erreur interne du serveur",
    });
  }
}