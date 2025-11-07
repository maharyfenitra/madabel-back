import type { FastifyInstance } from "fastify";
import { handleCreateEvaluation } from "./handlers/handleCreateEvaluation";
import { handleFindEvaluations } from "./handlers/handlefindEvaluations";
import { handleFindEvaluationById } from "./handlers/handleFindEvaluationById";
import { handleAddParticipant } from "./handlers/handleAddParticipant";
import { handleFindEvaluators } from "./handlers/handleFindEvaluators";
import { handleDeleteParticipant } from "./handlers/handleDeleteParticipant";
import { handleSendMailParticipant } from "./handlers/handleSendMailParticipant";
import candidateEvaluationRoutes from "../candidate-evaluations/candidateEvaluationRoutes";
import {handleUpdateEvaluation} from "./handlers/handleUpdateEvaluation";

export async function evaluationRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: any;
  }>("/evaluations/", {}, handleCreateEvaluation);

  fastify.post<{
    Body: any;
  }>("/evaluations/new/participant/", {}, handleAddParticipant);

  fastify.delete<{
    Params: { id: number };
  }>("/evaluations/delete/participant/:id", {}, handleDeleteParticipant);

  fastify.put<{
    Params?: { id?: string };
    Body: any;
  }>("/evaluations/:id", {}, handleUpdateEvaluation);

  fastify.get<{
    Body: any;
    Querystring: { page?: string; limit?: string }
  }>("/evaluations/", {}, handleFindEvaluations);

  fastify.get<{
    Body: any;
    Params: {
      id: number;
    };
  }>("/evaluations/evaluators/:id", {}, handleFindEvaluators);

  fastify.get<{
    Body: any;
    Params: { id: number };
  }>("/evaluations/:id", {}, handleFindEvaluationById);

  fastify.post<{
    Params: { id: string };
  }>("/evaluations/participant/:id/send-mail", {}, handleSendMailParticipant);

  // candidateEvaluationRoutes is registered separately in server.ts to avoid duplicate routes
}
