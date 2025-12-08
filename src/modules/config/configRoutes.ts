import type { FastifyInstance } from "fastify";
import { handleGetConfig, handleUpdateConfig } from "./handlers";

export const configRoutes = async (server: FastifyInstance) => {
  // GET /config - Récupérer la configuration (ADMIN seulement)
  server.get("/config", handleGetConfig);

  // PUT /config - Mettre à jour la configuration (ADMIN seulement)
  server.put("/config", handleUpdateConfig);
};
