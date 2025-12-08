import type { FastifyReply, FastifyRequest } from "fastify";
import { 
  prisma, 
  parseId, 
  sendBadRequest, 
  sendInternalError 
} from "../../../utils";

export const handleDeleteUser = async (
  request: FastifyRequest<{ Params?: { id?: string } }>,
  reply: FastifyReply
) => {
  try {
    // Parse body (handle multipart form data)
    let body = (request.body as any) || {};

    if (body && typeof body === "object" && body.fields && typeof body.fields === "object") {
      body = body.fields;
    }

    // Extract and parse user ID
    const idCandidate = body.id?.value ?? body.id ?? request.params?.id;
    const userId = parseId(idCandidate);
    
    if (!userId) {
      return sendBadRequest(reply, "ID utilisateur invalide");
    }

    // Soft delete user
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
    return sendInternalError(reply, "Impossible de supprimer l'utilisateur", error);
  }
};

export default handleDeleteUser;
