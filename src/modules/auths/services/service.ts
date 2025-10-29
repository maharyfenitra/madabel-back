import argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";

console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("JWT_REFRESH_SECRET:", process.env.JWT_REFRESH_SECRET);

// hash & verify
export async function hashPassword(password: string) {
  return await argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string) {
  return await argon2.verify(hash, password);
}

// JWT
export function generateAccessToken(userId: number) {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function generateRefreshToken(userId: number) {
  return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

// Vérification JWT
export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as { userId: number };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as { userId: number };
}

export const verifyJWT = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  console.log("verification");
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw reply.status(401).send({ error: "Token manquant" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw reply.status(401).send({ error: "Token invalide" });
  }

  try {
    const decoded = verifyAccessToken(token);
    (request as any).user = decoded; // stock le payload
    console.log(decoded)
  } catch (err) {
    throw reply.status(401).send({ err });
  }
};
