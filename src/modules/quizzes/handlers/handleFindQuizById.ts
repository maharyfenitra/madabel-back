import type { FastifyReply, FastifyRequest } from "fastify";
import { 
  prisma, 
  parseId, 
  sendBadRequest, 
  sendNotFound, 
  sendInternalError 
} from "../../../utils";

export const handleFindQuizById = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const params = req.params as any;
    const quizId = parseId(params.id);
    
    if (!quizId) {
      return sendBadRequest(reply, 'ID de quiz invalide');
    }

    const quiz = await prisma.quiz.findFirst({
      where: { 
        id: quizId,
        deletedAt: null // Exclude soft-deleted quizzes
      },
      include: { questions: { include: { options: true } } }
    });

    if (!quiz) {
      return sendNotFound(reply, 'Quiz non trouvé');
    }

    return reply.status(200).send({ quiz });
  } catch (error: any) {
    return sendInternalError(reply, 'Erreur lors de la récupération du quiz', error);
  }
};

export default handleFindQuizById;
