import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";

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
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET as any, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN as any,
  });
}

export function generateRefreshToken(userId: number) {
  return jwt.sign({ userId }, REFRESH_TOKEN_SECRET  as any, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN  as any,
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

// Vérification du rôle admin
export const verifyAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  console.log("vérification admin");
  const user = (request as any).user;

  if (!user || !user.userId) {
    throw reply.status(401).send({ error: "Utilisateur non authentifié" });
  }

  try {
    const userData = await prisma.user.findFirst({
      where: { id: user.userId, deletedAt: null },
      select: { role: true },
    });

    if (!userData) {
      throw reply.status(404).send({ error: "Utilisateur non trouvé" });
    }

    if (userData.role !== "ADMIN") {
      throw reply.status(403).send({ error: "Accès refusé : droits administrateur requis" });
    }

    console.log("Utilisateur admin vérifié:", user.userId);
    
  } catch (err: any) {
    if (err.statusCode) {
      throw err; // Re-throw Fastify errors
    }
    console.error("Erreur lors de la vérification admin:", err);
    throw reply.status(500).send({ error: "Erreur interne du serveur" });
  }
};

// utils/generatePassword.ts
export function generatePassword(len = 12): string {
  if (len < 4) throw new Error("len >= 4 required");
  const lower = "abcdefghijklmnopqrstuvwxyz", upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789", symbols = "!@#$%^&*()-_=+[]{};:,.<>?";
  const all = lower + upper + digits + symbols;
  const picks = [
    lower[Math.random()*lower.length|0],
    upper[Math.random()*upper.length|0],
    digits[Math.random()*digits.length|0],
    symbols[Math.random()*symbols.length|0],
  ];
  const remaining = len - picks.length;
  const bytes = (typeof globalThis !== "undefined" && (globalThis as any).crypto?.getRandomValues)
    ? (globalThis as any).crypto.getRandomValues(new Uint8Array(remaining))
    :  crypto.randomBytes(remaining);
  for (let i = 0; i < remaining; i++) picks.push(all[bytes[i] % all.length]);
  // simple shuffle
  for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
  return picks.join("");
}