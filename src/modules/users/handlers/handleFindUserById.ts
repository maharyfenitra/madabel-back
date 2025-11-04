import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleFindUserById = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;

    const userId = parseInt(String(id), 10);
    if (isNaN(userId) || userId <= 0) {
      return reply.status(400).send({ error: "Invalid user id" });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
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

    if (!user) {
      return reply.status(404).send({ error: "Utilisateur non trouvé" });
    }

    return reply.status(200).send({ user });
  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération de l'utilisateur:", error);
    return reply.status(500).send({
      error: "Erreur interne du serveur",
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
};

export default handleFindUserById;
