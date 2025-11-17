import type { FastifyInstance } from "fastify";
import { handleCreateEvaluation } from "./handlers/handleCreateEvaluation";
import { handleFindEvaluations } from "./handlers/handlefindEvaluations";
import { handleFindEvaluationById } from "./handlers/handleFindEvaluationById";
import { handleAddParticipant } from "./handlers/handleAddParticipant";
import { handleFindEvaluators } from "./handlers/handleFindEvaluators";
import { handleDeleteParticipant } from "./handlers/handleDeleteParticipant";
import { handleSendMailParticipant } from "./handlers/handleSendMailParticipant";
import { handleSendReminderParticipant } from "./handlers/handleSendReminderParticipant";
import { handleUpdateEvaluation } from "./handlers/handleUpdateEvaluation";
import { handleDeleteEvaluation } from "./handlers/handleDeleteEvaluation";
import { handleFindAllParticipants } from "./handlers/handleFindAllParticipants";
import { verifyJWT } from "../auths/services";

export async function evaluationRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", verifyJWT);
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

  fastify.delete<{
    Params: { id?: string };
    Querystring: { id?: string };
    Body?: { id?: number };
  }>("/evaluations/:id", {}, handleDeleteEvaluation);

  fastify.get<{
    Body: any;
    Querystring: { page?: string; limit?: string };
  }>("/evaluations/", {}, handleFindEvaluations);

  fastify.get<{
    Body: any;
    Params: {
      id: number;
    };
  }>("/evaluations/evaluators/:id", {}, handleFindEvaluators);

  fastify.get<{
    Body: any;
    Params: {
      id: number;
    };
  }>("/evaluations/participants/:id", {}, handleFindAllParticipants);

  fastify.get<{
    Body: any;
    Params: { id: number };
  }>("/evaluations/:id", {}, handleFindEvaluationById);

  fastify.post<{
    Params: { id: string };
  }>("/evaluations/participant/:id/send-mail", {}, handleSendMailParticipant);

  fastify.post<{
    Params: { id: string };
  }>("/evaluations/participant/:id/send-reminder", {}, handleSendReminderParticipant);
}
