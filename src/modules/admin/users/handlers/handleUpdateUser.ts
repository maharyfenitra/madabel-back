import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../../utils";

export const handleUpdateUser = async (
  request: FastifyRequest<{ Body: Record<string, any>; Params: { id: number } }>,
  reply: FastifyReply
) => {
  try {
    const userId = request.body.id ?? request.params.id;
    const body = request.body;

    const allowedFields = [
      "name",
      "email",
      "phone",
      "role",
      "isOnline",
      "isAvailable",
      "latitude",
      "longitude",
    ];

    const dataToUpdate: Record<string, any> = {};

    allowedFields.forEach((field) => {
      if (field in body) {
        let value = body[field];

        // Convertir latitude/longitude en float si ce n'est pas null
        if ((field === "latitude" || field === "longitude") && value !== null) {
          const parsed = parseFloat(value);
          value = isNaN(parsed) ? null : parsed; // si invalide => null
        }

        dataToUpdate[field] = value;
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    reply.status(200).send({ user: updatedUser });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ error: "Impossible de mettre à jour l'utilisateur" });
  }
};
