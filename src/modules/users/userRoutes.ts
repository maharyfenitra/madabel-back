import multipart from '@fastify/multipart';

import type { FastifyInstance } from "fastify";
import { handleFindUsers } from './handlers/handleFindUsers';
import { handleCreateUser } from './handlers/handleCreateUser';
import { handleFindUserById } from './handlers/handleFindUserById';
import { handleUpdateUser } from './handlers/handleUpdateUser';
import { handleDeleteUser } from './handlers/handleDeleteUser';

export async function userRoutes(fastify: FastifyInstance) {
  // Register multipart support for file uploads
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

  fastify.get<{
    Body: any;
     Querystring: { page?: string; limit?: string }
  }>("/users/", {}, handleFindUsers);

  fastify.get<{
    Params: { id: string };
  }>("/users/:id", {}, handleFindUserById);

  fastify.post<{
    Body: any;
  }>("/users/", {}, handleCreateUser);

  // Update user: accept id in body or in params
  fastify.put<{
    Params: { id?: string };
    Body: any;
  }>("/users/", {}, handleUpdateUser);

  fastify.put<{
    Params: { id: string };
    Body: any;
  }>("/users/:id", {}, handleUpdateUser);

  fastify.delete<{
    Params: { id?: string };
    Body: any;
  }>("/users/", {}, handleDeleteUser);

  fastify.delete<{
    Params: { id: string };
    Body: any;
  }>("/users/:id", {}, handleDeleteUser);
}
