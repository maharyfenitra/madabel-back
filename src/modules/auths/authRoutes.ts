import multipart from '@fastify/multipart';

import type { FastifyInstance } from "fastify";
import { handleSignUp, handleLogin, handleLogout, handleRequestPasswordReset, handleResetPassword } from "./handlers";
import type {  LoginBody, RefreshBody } from "./handlers";
import { handleTest } from "./handlers/handleTest";

export async function authRoutes(fastify: FastifyInstance) {

     // S'assurer que fastify-multipart est enregistré pour ces routes
  await fastify.register(multipart, {
    attachFieldsToBody: true, // ✅ Important pour accéder aux champs
    sharedSchemaId: '#multipartFile', // ✅ Définit un schéma partagé
    throwFileSizeLimit: false, // ✅ Ne pas throw mais retourner une erreur
    limits: {
      fieldNameSize: 100, // Taille max du nom du champ
      fieldSize: 100, // Taille max de la valeur du champ (en bytes)
      fields: 10, // Nombre max de champs
      fileSize: 50 * 1024 * 1024, // 50 Mo
      files: 1, // Nombre max de fichiers
      headerPairs: 2000 // Nombre max de paires header
    }
  });

  fastify.post<{
    Body: any;
  }>("/auth/signup/", {}, handleSignUp);

  // Login
  fastify.post<{
    Body: LoginBody;
  }>("/auth/login/", handleLogin);

  // Logout
  fastify.post<{
    Body: RefreshBody;
  }>("/auth/logout/", handleLogout);

  // Test
  fastify.get<{
    Body: RefreshBody;
  }>("/auth/test/", handleTest);

  // Demande de réinitialisation de mot de passe
  fastify.post<{
    Body: { email: string };
  }>("/auth/request-password-reset/", handleRequestPasswordReset);

  // Réinitialisation du mot de passe
  fastify.post<{
    Body: { token: string; newPassword: string };
  }>("/auth/reset-password/", handleResetPassword);
}
