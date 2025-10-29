import type { FastifyInstance } from "fastify";
import { handleGetUserList } from "./handlers/handleGetUserList";
import { handleGetUserDetails } from "./handlers/handleGetUserDetails";
import { verifyJWT } from "../../auths/services";
import { handleUpdateUser } from "./handlers/handleUpdateUser";

export async function userRoutes(fastify: FastifyInstance) {
  // S'assurer que fastify-multipart est enregistré pour ces routes

  fastify.get<{
    Body: any;
  }>("/admin/users/list/", { preHandler: verifyJWT }, handleGetUserList);

  fastify.get<{
    Params: { id: number };
  }>(
    "/admin/users/details/:id",
    { preHandler: verifyJWT },
    handleGetUserDetails
  );

  fastify.put("/admin/update/user/", handleUpdateUser);
}
