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

    // Vérifier que l'utilisateur est bien un participant CANDIDAT de cette évaluation
    const evaluationParticipant = await prisma.evaluationParticipant.findFirst({
      where: {
        evaluationId: parseInt(evaluationId),
        userId: user.userId,
        participantRole: "CANDIDAT",
      },
    });

    if (!evaluationParticipant) {
      return reply.status(403).send({
        error: "Vous n'êtes pas autorisé à accéder à ce rapport",
      });
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
          where: { participantRole: "EVALUATOR" },
          include: {
            user: true,
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
      const answers = evaluation.participants
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
        totalEvaluators: evaluation.participants.length,
        answeredEvaluators: validAnswers.length,
      });
    }

    // Convertir l'objet en tableau pour le retour
    const report = Object.values(reportData);

    return reply.send({
      evaluationId: parseInt(evaluationId),
      evaluationRef: evaluation.ref,
      report,
    });
  } catch (error) {
    console.error("Erreur lors de la génération du rapport:", error);
    return reply.status(500).send({
      error: "Erreur interne du serveur",
    });
  }
}