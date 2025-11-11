import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

/*
 Expected body shape:
 {
   answers: [
     { questionId: number, selectedOptionId?: number, selectedOptionIds?: number[], textAnswer?: string, numericAnswer?: number }
   ]
 }
*/

export const handleSubmitAnswers = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const participantId = parseInt(params.participantId, 10);
    if (Number.isNaN(participantId)) return reply.status(400).send({ error: 'participantId invalide' });

    const body = req.body as any;
    const answers = Array.isArray(body.answers) ? body.answers : [];

    // Verify participant exists
    const participant = await prisma.evaluationParticipant.findUnique({ where: { id: participantId } });
    if (!participant) return reply.status(404).send({ error: 'Participant introuvable' });

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
              selectedOptionId: a.selectedOptionId ?? null,
              textAnswer: a.textAnswer ?? null,
              numericAnswer: typeof a.numericAnswer === 'number' ? a.numericAnswer : null,
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
              evaluationParticipantId: participantId,
              questionId: a.questionId,
              selectedOptionId: a.selectedOptionId ?? null,
              textAnswer: a.textAnswer ?? null,
              numericAnswer: typeof a.numericAnswer === 'number' ? a.numericAnswer : null,
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
