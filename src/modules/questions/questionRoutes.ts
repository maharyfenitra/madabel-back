import type { FastifyInstance } from "fastify";

import { handleCreateQuestion } from "./handlers/handleCreateQuestion";
import { handleFindQuestions } from "./handlers/handleFindQuestions";
import { handleUpdateQuestion } from "./handlers/handleUpdateQuestion";
import { handleDeleteQuestion } from "./handlers/handleDeleteQuestion";
import { verifyJWT } from "../auths/services";

export async function questionRoutes(fastify: FastifyInstance) {

  fastify.addHook("preHandler", verifyJWT);

  // Questions (nested under quizzes)
  fastify.get<{ Params: { quizId: string } }>(
    "/quizzes/:quizId/questions",
    {},
    handleFindQuestions
  );

  fastify.post<{ Params: { quizId: string }; Body: any }>(
    "/quizzes/:quizId/questions",
    {},
    handleCreateQuestion
  );

  fastify.put<{ Params: { id: string }; Body: any }>(
    "/questions/:id",
    {},
    handleUpdateQuestion
  );

  fastify.delete<{ Params: { id: string } }>(
    "/questions/:id",
    { },
    handleDeleteQuestion
  );
}

export default questionRoutes;
