import type { FastifyInstance } from "fastify";
import { verifyJWT } from "../auths/services";
import { handleGetDriversList } from "./handlers/handleGetDriversList";
import { handleGetClientsList } from "./handlers/handleGetClientsList";
import { handleGetNearestDrivers } from "./handlers/handleGetNearestDriver";

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/users/drivers/",
    { preHandler: verifyJWT },
    handleGetDriversList
  );

  fastify.get(
    "/users/clients/",
    { preHandler: verifyJWT },
    handleGetClientsList
  );

  fastify.get(
    "/nearest/drivers/",
    { preHandler: verifyJWT },
    handleGetNearestDrivers
  );
}
