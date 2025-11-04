import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { hashPassword } from "../../auths/services";
import path from "path";
import fs from "fs";

export const handleUpdateUser = async (
  request: FastifyRequest<{ Params?: { id?: string } }> ,
  reply: FastifyReply
) => {
  try {
    // id can be in body (when using mutateAsync) or in params
    let body = (request.body as any) || {};

    // Some multipart parsers attach fields under a wrapping field object with a `fields` map.
    // Normalize to use `body` as the plain fields map when that's the case.
    if (body && typeof body === "object" && body.fields && typeof body.fields === "object") {
      body = body.fields;
    }

    // Support cases where each field may be an object { value } (multipart) or a direct value (JSON)
    const idCandidate = body.id?.value ?? body.id ?? request.params?.id;
    const userId = parseInt(String(idCandidate ?? ""), 10);
    if (isNaN(userId) || userId <= 0) {
      console.log("Invalid user id:", idCandidate);
      return reply.status(400).send({ error: "Invalid user id" });
    }

   
    const dataToUpdate: Record<string, any> = {};

    // If request is multipart with attachFieldsToBody, files may be on body.avatar
    // Handle avatar file
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
    const role = body.role?.value ?? body.role;
    const passwordRaw = body.password?.value ?? body.password;

    if (typeof name !== 'undefined') dataToUpdate.name = String(name);
    if (typeof email !== 'undefined') dataToUpdate.email = email ? String(email).toLowerCase() : null;
    if (typeof phone !== 'undefined') dataToUpdate.phone = String(phone);
    if (typeof post !== 'undefined') dataToUpdate.post = post ? String(post) : null;
    if (typeof role !== 'undefined') dataToUpdate.role = String(role) as any;

    // Handle password separately (hash if provided and non-empty)
    if (typeof passwordRaw !== 'undefined' && passwordRaw) {
      const hashed = await hashPassword(String(passwordRaw));
      dataToUpdate.password = hashed;
    }

    // If no fields to update, return 400
    if (Object.keys(dataToUpdate).length === 0) {
      return reply.status(400).send({ error: "Aucune donnée à mettre à jour" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        post: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    return reply.status(200).send({ user: updated });
  } catch (error: any) {
    console.error("❌ Erreur lors de la mise à jour de l'utilisateur:", error);
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return reply.status(409).send({ error: `Conflit: ${field} déjà utilisé` });
    }
    return reply.status(500).send({ error: "Impossible de mettre à jour l'utilisateur" });
  }
};

export default handleUpdateUser;
