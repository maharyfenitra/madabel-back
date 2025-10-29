import multipart from "@fastify/multipart";

import type { FastifyInstance } from "fastify";
import { handleGetMyProfile } from "./handlers/handleGetMyProfile";
import { handleUpdateMyProfile } from "./handlers/handleUpdateMyProfile";
import { verifyJWT } from "../auths/services";

export async function profileRoutes(fastify: FastifyInstance) {
  // S'assurer que fastify-multipart est enregistré pour ces routes
  await fastify.register(multipart, {
    attachFieldsToBody: true, // ✅ Important pour accéder aux champs
    sharedSchemaId: "#multipartFile", // ✅ Définit un schéma partagé
    throwFileSizeLimit: false, // ✅ Ne pas throw mais retourner une erreur
    limits: {
      fieldNameSize: 100, // Taille max du nom du champ
      fieldSize: 100, // Taille max de la valeur du champ (en bytes)
      fields: 10, // Nombre max de champs
      fileSize: 50 * 1024 * 1024, // 50 Mo
      files: 2, // Nombre max de fichiers
      headerPairs: 2000, // Nombre max de paires header
    },
  });

  fastify.get(
    "/profiles/my-profile/",
    { preHandler: verifyJWT },
    handleGetMyProfile
  );

  fastify.put(
    "/profiles/update/",
    { preHandler: verifyJWT },
    handleUpdateMyProfile
  );
}
