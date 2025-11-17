import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import { handleUpdateUserProfile } from "./handlers/handleUpdateUserProfile";
import { verifyJWT } from "../auths/services/service";

export async function profileRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    attachFieldsToBody: true, // ✅ Important pour accéder aux champs
    sharedSchemaId: "#multipartFile", // ✅ Définit un schéma partagé
    throwFileSizeLimit: false, // ✅ Ne pas throw mais retourner une erreur
    limits: {
      fieldNameSize: 100, // Taille max du nom du champ
      fieldSize: 100, // Taille max de la valeur du champ (en bytes)
      fields: 10, // Nombre max de champs
      fileSize: 50 * 1024 * 1024, // 50 Mo
      files: 1, // Nombre max de fichiers
      headerPairs: 2000, // Nombre max de paires header
    },
  });
  fastify.addHook("preHandler", verifyJWT);

  // Route pour mettre à jour le profil de l'utilisateur connecté
  fastify.put<{
    Body: {
      name?: string;
      email?: string;
      phone?: string;
      post?: string;
      avatar?: string;
    };
  }>("/profile", {}, handleUpdateUserProfile);
}
