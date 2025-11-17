import type { FastifyInstance } from "fastify";
import { handleGetQuizForCandidate } from "./handlers/handleGetQuizForCandidate";
import { handleSubmitAnswers } from "./handlers/handleSubmitAnswers";
import { handleFindCandidateEvaluations } from "./handlers/handleFindCandidateEvaluations";
import { handleGetCandidateAnswers } from "./handlers/handleGetCandidateAnswers";
import { handleGetCandidateEvaluationById } from "./handlers/handleGetCandidateEvaluationById";
import { verifyJWT } from "../auths/services/service";

export async function candidateEvaluationRoutes(fastify: FastifyInstance) {
  // Get quiz (questions + options) for candidate to fill
  fastify.get<{
    Params: { quizId: string };
  }>("/candidate-evaluations/quiz/:quizId", {}, handleGetQuizForCandidate);

  // Get evaluations for the authenticated candidate
  fastify.get<{
    Querystring: { page?: string; limit?: string }
  }>("/candidate-evaluations/", { preHandler: verifyJWT }, handleFindCandidateEvaluations);

  // Get specific evaluation details for the authenticated candidate
  fastify.get<{
    Params: { evaluationId: string };
  }>("/candidate-evaluations/:evaluationId", { preHandler: verifyJWT }, handleGetCandidateEvaluationById);

  // Submit answers for a participant (evaluationParticipant id)
  fastify.post<{
    Params: { participantId: string };
    Body: any;
  }>("/candidate-evaluations/participant/:participantId/", { preHandler: verifyJWT }, handleSubmitAnswers);

  // Get candidate's previous answers for a specific evaluation
  fastify.get<{
    Params: { evaluationId: string };
  }>("/candidate-evaluations/:evaluationId/answers", { preHandler: verifyJWT }, handleGetCandidateAnswers);
}

export default candidateEvaluationRoutes;
