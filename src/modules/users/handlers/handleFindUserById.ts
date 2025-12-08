import type { FastifyReply, FastifyRequest } from "fastify";
import { 
  prisma, 
  parseId, 
  sendBadRequest, 
  sendNotFound, 
  sendInternalError 
} from "../../../utils";

export const handleFindUserById = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;

    // Validate and parse ID
    const userId = parseId(id);
    if (!userId) {
      return sendBadRequest(reply, "ID utilisateur invalide");
    }

    // Fetch user (exclude soft-deleted)
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
      return sendNotFound(reply, "Utilisateur non trouvé");
    }

    return reply.status(200).send({ user });
  } catch (error: any) {
    return sendInternalError(reply, "Erreur lors de la récupération de l'utilisateur", error);
  }
};

export default handleFindUserById;
