import multipart from '@fastify/multipart';

import type { FastifyInstance } from "fastify";
import { handleFindUsers } from './handlers/handleFindUsers';
export async function userRoutes(fastify: FastifyInstance) {

  fastify.get<{
    Body: any;
  }>("/users/list/", {}, handleFindUsers);
}
