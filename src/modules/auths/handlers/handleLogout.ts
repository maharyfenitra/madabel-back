
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

export type RefreshBody = { refreshToken: string; };
// Logout
export const handleLogout = async (req: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return reply.status(400).send({ error: "Missing refresh token" });
  console.log(refreshToken)
  //await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  return reply.send({ ok: true });
};