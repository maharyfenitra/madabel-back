import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../../utils";

export const handleGetUserList = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const userPayload = (request as any).user;

  const users = await prisma.user.findMany()

  return reply.status(200).send(users);
};