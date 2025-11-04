import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleDeleteUser = async (
  request: FastifyRequest<{ Params?: { id?: string } }>,
  reply: FastifyReply
) => {
  try {
    let body = (request.body as any) || {};

    if (body && typeof body === "object" && body.fields && typeof body.fields === "object") {
      body = body.fields;
    }

    const idCandidate = body.id?.value ?? body.id ?? request.params?.id;
    const userId = parseInt(String(idCandidate ?? ""), 10);
    if (isNaN(userId) || userId <= 0) {
      return reply.status(400).send({ error: "Invalid user id" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        post: true,
        role: true,
        avatar: true,
        deletedAt: true,
      },
    });

    return reply.status(200).send({ user: updated });
  } catch (error: any) {
    console.error("❌ Erreur lors de la suppression de l'utilisateur:", error);
    return reply.status(500).send({ error: "Impossible de supprimer l'utilisateur" });
  }
};

export default handleDeleteUser;
