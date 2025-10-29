import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../services";
type RefreshBody = { refreshToken: string; };
// Refresh
export const handleRefresh = async (req: FastifyRequest<{ Body: RefreshBody }>, reply: FastifyReply) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return reply.status(400).send({ error: "Missing refresh token" });

  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokenInDb = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!tokenInDb) return reply.status(401).send({ error: "Invalid refresh token" });

    const accessToken = generateAccessToken(payload.userId);
    return reply.send({ accessToken });
  } catch (err) {
    return reply.status(401).send({ error: "Invalid refresh token" });
  }
};