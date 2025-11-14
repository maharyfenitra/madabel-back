import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

/*
 Expected body shape:
 {
   evaluationId: number, // ID de l'évaluation (pour validation)
   isDraft?: boolean, // true pour sauvegarde automatique (brouillon), false pour soumission finale
   answers: [
     { questionId: number, selectedOptionId?: number, selectedOptionIds?: number[], textAnswer?: string, numericAnswer?: number }
   ]
 }
*/

export const handleSubmitAnswers = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;

    const user = (req as any)?.user;

    const participantId = parseInt(params.participantId, 10);
    if (Number.isNaN(participantId)) return reply.status(400).send({ error: 'participantId invalide' });

    const body = req.body as any;
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const evaluationIdFromBody = body.evaluationId ? parseInt(body.evaluationId, 10) : null;
    const isDraft = body.isDraft === true; // Par défaut false si non spécifié

    // Verify participant exists and get evaluation info
    const participant = await prisma.evaluationParticipant.findFirst({
      where: { userId: user.userId, evaluationId: params?.evaluationId },
      include: { evaluation: true }
    });

    if (!participant) return reply.status(404).send({ error: 'Participant introuvable' });

    // Validate that evaluationId from body matches the participant's evaluation
    if (evaluationIdFromBody && evaluationIdFromBody !== participant.evaluationId) {
      return reply.status(400).send({ error: 'evaluationId du body ne correspond pas à l\'évaluation du participant' });
    }

    const evaluationId = participant.evaluationId;
    const createdAnswers: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const a of answers) {
        // Check if answer already exists for this participant and question
        const existingAnswer = await tx.answer.findFirst({
          where: {
            evaluationParticipantId: participantId,
            questionId: a.questionId
          }
        });

        let answer;
        if (existingAnswer) {
          // Update existing answer
          answer = await tx.answer.update({
            where: { id: existingAnswer.id },
            data: {
              evaluationId: evaluationId,
              selectedOptionId: a.selectedOptionId ?? null,
              textAnswer: a.textAnswer ?? null,
              numericAnswer: typeof a.numericAnswer === 'number' ? a.numericAnswer : null,
              submittedAt: isDraft ? null : new Date(),
              isDraft: isDraft,
            }
          });

          // Delete existing answer options for multiple choice
          await tx.answerOption.deleteMany({
            where: { answerId: existingAnswer.id }
          });

        } else {
          // Create new answer
          answer = await tx.answer.create({
            data: {
              evaluationId: evaluationId,
              evaluationParticipantId: participantId,
              questionId: a.questionId,
              selectedOptionId: a.selectedOptionId ?? null,
              textAnswer: a.textAnswer ?? null,
              numericAnswer: typeof a.numericAnswer === 'number' ? a.numericAnswer : null,
              submittedAt: isDraft ? null : new Date(),
              isDraft: isDraft,
            }
          });
        }

        // Handle multiple choice options
        if (Array.isArray(a.selectedOptionIds) && a.selectedOptionIds.length > 0) {
          const toCreate = a.selectedOptionIds.map((optId: number) => ({ answerId: answer.id, optionId: optId }));
          await tx.answerOption.createMany({ data: toCreate });
        }

        createdAnswers.push(answer);
      }

      // Optionally mark evaluation as completed for this participant
      // Here we just set evaluation.completedAt if all participants have answered; keeping simple for now
    });

    return reply.status(201).send({ ok: true, createdAnswers });
  } catch (error: any) {
    console.error('Erreur submit answers:', error);
    return reply.status(500).send({ error: 'Erreur interne', details: error.message });
  }
};

export default handleSubmitAnswers;
