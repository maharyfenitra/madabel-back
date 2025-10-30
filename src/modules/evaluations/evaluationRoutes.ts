import type { FastifyInstance } from "fastify";
import { handleCreateEvaluation } from "./handlers/handleCreateEvaluation";
import { handleFindEvaluations } from "./handlers/handlefindEvaluations";
import { handleFindEvaluationById } from "./handlers/handleFindEvaluationById";

export async function evaluationRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: any;
  }>("/evaluations/", {}, handleCreateEvaluation);

  fastify.get<{
    Body: any;
  }>("/evaluations/", {}, handleFindEvaluations);

  fastify.get<{
    Body: any;
    Params: { id: number };
  }>("/evaluations/:id", {}, handleFindEvaluationById);
}
