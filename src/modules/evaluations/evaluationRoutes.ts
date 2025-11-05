import type { FastifyInstance } from "fastify";
import { handleCreateEvaluation } from "./handlers/handleCreateEvaluation";
import { handleFindEvaluations } from "./handlers/handlefindEvaluations";
import { handleFindEvaluationById } from "./handlers/handleFindEvaluationById";
import { handleAddParticipant } from "./handlers/handleAddParticipant";
import { handleFindEvaluators } from "./handlers/handleFindEvaluators";
import { handleDeleteParticipant } from "./handlers/handleDeleteParticipant";
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
}
