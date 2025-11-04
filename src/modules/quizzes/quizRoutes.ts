import type { FastifyInstance } from "fastify";
import { handleCreateQuiz } from './handlers/handleCreateQuiz';
import { handleFindQuizzes } from './handlers/handleFindQuizzes';
import { handleFindQuizById } from './handlers/handleFindQuizById';
import { handleUpdateQuiz } from './handlers/handleUpdateQuiz';
import { handleDeleteQuiz } from './handlers/handleDeleteQuiz';

export async function quizRoutes(fastify: FastifyInstance) {
  // Quizzes
  fastify.get<{}>("/quizzes/", {}, handleFindQuizzes);

  fastify.get<{ Params: { id: string } }>("/quizzes/:id", {}, handleFindQuizById);

  fastify.post<{ Body: any }>("/quizzes/", {}, handleCreateQuiz);

  fastify.put<{ Params: { id?: string }; Body: any }>("/quizzes/", {}, handleUpdateQuiz);
  fastify.put<{ Params: { id: string }; Body: any }>("/quizzes/:id", {}, handleUpdateQuiz);

  fastify.delete<{ Params: { id?: string } }>("/quizzes/", {}, handleDeleteQuiz);
  fastify.delete<{ Params: { id: string } }>("/quizzes/:id", {}, handleDeleteQuiz);

}

export default quizRoutes;
