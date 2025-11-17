import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import path from "path";
import fs from "fs";

export const handleUpdateUserProfile = async (
  request: FastifyRequest<{
    Body: any; // Support multipart data
  }>,
  reply: FastifyReply
) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis le token JWT
    const userPayload = (request as any).user;
    if (!userPayload || !userPayload.userId) {
      return reply.status(401).send({ error: "Utilisateur non authentifié" });
    }

    const userId = Number(userPayload.userId);

    // Normaliser le body pour gérer les données multipart
    let body = (request.body as any) || {};

    // Some multipart parsers attach fields under a wrapping field object with a `fields` map.
    // Normalize to use `body` as the plain fields map when that's the case.
    if (body && typeof body === "object" && body.fields && typeof body.fields === "object") {
      body = body.fields;
    }

    const dataToUpdate: Record<string, any> = {};

    // Handle avatar file upload
    if (body.avatar && typeof body.avatar === "object" && typeof body.avatar.toBuffer === "function") {
      const avatar = body.avatar;
      const ext = path.extname(avatar.filename || "") || "";
      const avatarFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const filePath = path.join(process.cwd(), "public", "avatars", avatarFileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const buffer = await avatar.toBuffer();
      fs.writeFileSync(filePath, buffer);
      dataToUpdate.avatar = avatarFileName;
    }

    // Récupérer les champs texte qui peuvent venir du multipart
    const name = body.name?.value ?? body.name;
    const email = body.email?.value ?? body.email;
    const phone = body.phone?.value ?? body.phone;
    const post = body.post?.value ?? body.post;

    if (typeof name !== 'undefined') dataToUpdate.name = String(name);
    if (typeof email !== 'undefined') dataToUpdate.email = email ? String(email).toLowerCase() : null;
    if (typeof phone !== 'undefined') dataToUpdate.phone = String(phone);
    if (typeof post !== 'undefined') dataToUpdate.post = post ? String(post) : null;

    // Vérifier que l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return reply.status(404).send({ error: "Utilisateur non trouvé" });
    }

    // Vérifier les contraintes d'unicité si email ou phone sont fournis
    if (dataToUpdate.email && dataToUpdate.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: dataToUpdate.email },
      });
      if (emailExists) {
        return reply.status(400).send({ error: "Cet email est déjà utilisé par un autre utilisateur" });
      }
    }

    if (dataToUpdate.phone && dataToUpdate.phone !== existingUser.phone) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone: dataToUpdate.phone },
      });
      if (phoneExists) {
        return reply.status(400).send({ error: "Ce numéro de téléphone est déjà utilisé par un autre utilisateur" });
      }
    }

    // If no fields to update, return 400
    if (Object.keys(dataToUpdate).length === 0) {
      return reply.status(400).send({ error: "Aucune donnée à mettre à jour" });
    }

    // Mettre à jour le profil utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        post: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    return reply.status(200).send({
      message: "Profil mis à jour avec succès",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return reply.status(409).send({ error: `Conflit: ${field} déjà utilisé` });
    }
    return reply.status(500).send({
      error: "Erreur interne du serveur",
    });
  }
};