import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import {
  generateEvaluationPDF,
  sendEmail,
  formatAnswersForPDF,
  prepareAnswerData,
} from "../../service";

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

export const handleSubmitAnswers = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const params = req.params as any;

    const user = (req as any)?.user;

    const participantId = parseInt(params.participantId, 10);
    if (Number.isNaN(participantId))
      return reply.status(400).send({ error: "participantId invalide" });

    const body = req.body as any;
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const evaluationIdFromBody = body.evaluationId
      ? parseInt(body.evaluationId, 10)
      : null;
    const isDraft = body.isDraft === true; // Par défaut false si non spécifié
    const isFinalSubmit = body.isFinalSubmit === true; // Nouvelle propriété pour soumission finale

    if (!evaluationIdFromBody) {
      return reply.status(400).send({ error: "evaluationId manquant dans le body" });
    }

    // Verify participant exists and get evaluation info
    const participant = await prisma.evaluationParticipant.findFirst({
      where: {
        userId: user.userId,
        evaluationId: evaluationIdFromBody,
        participantRole: "EVALUATOR",
      },
      include: { evaluation: true },
    });

    if (!participant)
      return reply.status(404).send({ error: "Participant introuvable" });

    // Vérifier si l'évaluation a déjà été complétée
    // Bloquer uniquement si c'est une soumission finale et que l'évaluation est déjà complétée
    if (participant.completedAt && isFinalSubmit) {
      return reply.status(400).send({ 
        error: "Évaluation déjà complétée", 
        completedAt: participant.completedAt 
      });
    }

    const evaluationId = participant.evaluationId;
    const createdAnswers: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const a of answers) {
        const existingAnswer = await tx.answer.findFirst({
          where: {
            evaluationParticipantId: participantId,
            questionId: a.questionId,
          },
        });

        const answerData = prepareAnswerData(a, evaluationId, isDraft);

        let answer;
        if (existingAnswer) {
          answer = await tx.answer.update({
            where: { id: existingAnswer.id },
            data: answerData,
          });

          await tx.answerOption.deleteMany({
            where: { answerId: existingAnswer.id },
          });
        } else {
          answer = await tx.answer.create({
            data: {
              ...answerData,
              evaluationParticipantId: participantId,
              questionId: a.questionId,
            },
          });
        }

        if (
          Array.isArray(a.selectedOptionIds) &&
          a.selectedOptionIds.length > 0
        ) {
          const toCreate = a.selectedOptionIds.map((optId: number) => ({
            answerId: answer.id,
            optionId: optId,
          }));
          await tx.answerOption.createMany({ data: toCreate });
        }

        createdAnswers.push(answer);
      }

      if (isFinalSubmit) {
        await tx.evaluationParticipant.update({
          where: { id: participantId },
          data: { completedAt: new Date() },
        });
      }
    });

    if (isFinalSubmit) {
      try {
        const participantWithData =
          await prisma.evaluationParticipant.findUnique({
            where: { id: participantId },
            include: {
              user: true,
              evaluation: {
                include: {
                  participants: {
                    where: { participantRole: "EVALUATOR" },
                    include: { user: true },
                  },
                },
              },
            },
          });

        const allAnswers = await prisma.answer.findMany({
          where: { evaluationParticipantId: participantId },
          include: {
            question: { include: { options: true } },
            selectedOption: true,
            selectedOptions: { include: { option: true } },
          },
          orderBy: { question: { order: "asc" } },
        });

        const formattedAnswers = formatAnswersForPDF(allAnswers as any);
        const candidat = participantWithData?.evaluation?.participants?.[0];

        const pdfBuffer = await generateEvaluationPDF({
          evaluatorName: participantWithData?.user?.name || "Inconnu",
          candidateName: candidat?.user?.name || "Inconnu",
          evaluationRef: participantWithData?.evaluation?.ref || "",
          completedAt: new Date(),
          answers: formattedAnswers,
        });

        const toEmail = participantWithData?.user?.email;
        if (toEmail) {
          await sendEmail({
            to: toEmail,
            subject: `Évaluation complétée - ${participantWithData?.evaluation?.ref}`,
            html: `
              <p>Bonjour ${participantWithData?.user?.name},</p>
              
              <p>Merci d'avoir complété votre évaluation pour <strong>${candidat?.user?.name}</strong>.</p>
              
              <p>Vous trouverez en pièce jointe un récapitulatif de vos réponses au format PDF.</p>
              
              <p>Ce document est confidentiel et destiné à votre usage personnel uniquement.</p>
              
              <p>Cordialement,<br/>L'équipe MADABEL</p>
            `,
            attachments: [
              {
                filename: `evaluation_${participantWithData?.evaluation?.ref}_${new Date().getTime()}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ],
          });
        }
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email:", emailError);
      }
    }

    return reply.status(201).send({ 
      ok: true, 
      createdAnswers,
      completedAt: isFinalSubmit ? new Date() : null
    });
  } catch (error: any) {
    console.error("Erreur submit answers:", error);
    return reply
      .status(500)
      .send({ error: "Erreur interne", details: error.message });
  }
};

export default handleSubmitAnswers;
