import type { FastifyInstance } from "fastify";
import { handleGetConfig, handleUpdateConfig } from "./handlers";
import { verifyJWT } from "../auths/services";

export const configRoutes = async (server: FastifyInstance) => {
  // Ajouter le middleware d'authentification JWT pour toutes les routes
  server.addHook("preHandler", verifyJWT);

  // GET /config - Récupérer la configuration (ADMIN seulement)
  server.get("/config", handleGetConfig);

  // PUT /config - Mettre à jour la configuration (ADMIN seulement)
  server.put("/config", handleUpdateConfig);
};
