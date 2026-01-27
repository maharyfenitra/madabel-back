import type { FastifyInstance } from "fastify";
import { handleGetEvaluationReport } from "./handlers/handleGetEvaluationReport";
import { handleGetAllReports } from "./handlers/handleGetAllReports";
import { handleSendReportEmail } from "./handlers/handleSendReportEmail";
import { verifyJWT } from "../auths/services";

export async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifyJWT);

  // Liste de tous les rapports accessibles selon le rôle
  fastify.get<{
    Querystring: { page?: string; limit?: string };
  }>("/reports", {}, handleGetAllReports);

  // Détails d'un rapport spécifique
  fastify.get<{
    Params: { evaluationId: string };
  }>("/reports/:evaluationId", {}, handleGetEvaluationReport);

  // Envoyer le rapport par email au candidat
  fastify.post<{
    Params: { evaluationId: string };
    Body: { candidatEmail: string; candidatName: string };
  }>("/reports/:evaluationId/send-email", {}, handleSendReportEmail);
}