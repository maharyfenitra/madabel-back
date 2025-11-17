import type { FastifyInstance } from "fastify";
import { handleGetEvaluationReport } from "./handlers/handleGetEvaluationReport";
import { verifyJWT } from "../auths/services";

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifyJWT);

  fastify.get<{
    Params: { evaluationId: string };
  }>("/reports/:evaluationId", {}, handleGetEvaluationReport);
}