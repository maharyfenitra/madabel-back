import type { FastifyInstance } from "fastify";

import { handleCreateQuestion } from "./handlers/handleCreateQuestion";
import { handleFindQuestions } from "./handlers/handleFindQuestions";
import { handleUpdateQuestion } from "./handlers/handleUpdateQuestion";
import { handleDeleteQuestion } from "./handlers/handleDeleteQuestion";
import { verifyJWT, verifyAdmin } from "../auths/services";

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
    { preHandler: verifyAdmin },
    handleCreateQuestion
  );

  fastify.put<{ Params: { id: string }; Body: any }>(
    "/questions/:id",
    { preHandler: verifyAdmin },
    handleUpdateQuestion
  );

  fastify.delete<{ Params: { id: string } }>(
    "/questions/:id",
    { preHandler: verifyAdmin },
    handleDeleteQuestion
  );
}

export default questionRoutes;
