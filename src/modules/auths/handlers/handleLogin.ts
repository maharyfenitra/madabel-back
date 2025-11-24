import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { verifyPassword, generateAccessToken, generateRefreshToken } from "../services";


export type LoginBody = { email: string; password: string; };
// Login
export const handleLogin = async (req: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.status(401).send({ error: "Invalid credentials" });

  const valid = await verifyPassword(user.password, password);
  if (!valid) return reply.status(401).send({ error: "Invalid credentials" });

  // Marquer que l'utilisateur s'est connecté au moins une fois
  if (user.isFirstLogin) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isFirstLogin: false }
    });
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  console.log(accessToken)

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7*24*3600*1000) },
  });

  return reply.send({ accessToken, refreshToken, user });
};