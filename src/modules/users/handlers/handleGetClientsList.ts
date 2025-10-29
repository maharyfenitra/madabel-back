import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export const handleGetClientsList = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const userPayload = (request as any).user;

  const drivers = await prisma.user.findMany({
    where: {
      AND: {
        NOT: { id: userPayload.userId },
        role: "CLIENT",
      },
    },

    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      vehicles: {
        select: {
          id: true,
          brand: true,
          registration: true,
          photo: true,
        },
      },
    },
  });

  return reply.status(200).send(drivers);
};
