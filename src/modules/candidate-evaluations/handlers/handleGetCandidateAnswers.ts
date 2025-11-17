import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export async function handleGetCandidateAnswers(
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

    // Vérifier que l'utilisateur est bien un participant de cette évaluation
    const evaluationParticipant = await prisma.evaluationParticipant.findFirst({
      where: {
        evaluationId: parseInt(evaluationId),
        userId: user.userId,
        participantRole: "EVALUATOR",
      },
    });

    if (!evaluationParticipant) {
      return reply.status(403).send({
        error: "Vous n'êtes pas autorisé à accéder à cette évaluation",
      });
    }

    // Récupérer toutes les réponses de ce participant pour cette évaluation
    const answers = await prisma.answer.findMany({
      where: {
        evaluationParticipantId: evaluationParticipant.id,
      },
      include: {
        question: {
          include: {
            options: true,
          },
        },
        selectedOption: true,
        selectedOptions: {
          include: {
            option: true,
          },
        },
      },
      orderBy: {
        question: {
          order: "asc",
        },
      },
    });

    // Formater les réponses pour un retour propre
    const formattedAnswers = answers.map((answer) => {
      const baseAnswer = {
        questionId: answer.questionId,
        questionText: answer.question.text,
        questionType: answer.question.type,
        submittedAt: answer.submittedAt,
        isDraft: answer.isDraft,
      };

      // Selon le type de question, retourner la réponse appropriée
      switch (answer.question.type) {
        case "TEXT":
          return {
            ...baseAnswer,
            answer: answer.textAnswer,
          };

        case "SCALE":
          return {
            ...baseAnswer,
            answer: answer.numericAnswer,
          };

        case "SINGLE_CHOICE":
          return {
            ...baseAnswer,
            answer: answer.selectedOption
              ? {
                  id: answer.selectedOption.id,
                  text: answer.selectedOption.text,
                  value: answer.selectedOption.value,
                }
              : null,
          };

        case "MULTIPLE_CHOICE":
          return {
            ...baseAnswer,
            answer: answer.selectedOptions.map((ao) => ({
              id: ao.option.id,
              text: ao.option.text,
              value: ao.option.value,
            })),
          };

        default:
          return baseAnswer;
      }
    });

    return reply.send({
      evaluationId: parseInt(evaluationId),
      participantId: evaluationParticipant.id,
      answers: formattedAnswers,
      totalAnswers: formattedAnswers.length,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des réponses:", error);
    return reply.status(500).send({
      error: "Erreur interne du serveur",
    });
  }
}
