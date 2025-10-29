import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { hashPassword, generateAccessToken, generateRefreshToken } from "../services";
import path from "path";
import fs from "fs";

// Signup
export const handleSignUp = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    // Vérifier que c'est une requête multipart
    if (!req.isMultipart()) {
      return reply.status(400).send({ error: "Content-Type must be multipart/form-data" });
    }

    const body = req.body as Record<string, any>;
    
    console.log("📥 Champs reçus:", Object.keys(body));

    // Récupérer les champs texte correctement
    const name = body.name?.value || body.name;
    const email = body.email?.value || body.email;
    const phone = body.phone?.value || body.phone;
    const role = body.role?.value || body.role;
    const password = body.password?.value || body.password;

    // Validation des champs requis
    if (!name || !password || !phone) {
      return reply.status(400).send({ 
        error: "Champs manquants",
        details: {
          name: !name,
          password: !password,
          phone: !phone
        }
      });
    }

    let avatarFileName: string | null = null;

    // Traiter l'avatar si présent
    if (body.avatar) {
      const avatar = body.avatar;
      
      const ext = path.extname(avatar.filename);
      avatarFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const filePath = path.join(__dirname, "../../../../public/avatars", avatarFileName);
      
      // Créer le dossier s'il n'existe pas
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      
      // Convertir en buffer et sauvegarder
      const buffer = await avatar.toBuffer();
      fs.writeFileSync(filePath, buffer);
      
      console.log("✅ Avatar sauvegardé:", avatarFileName);
    }

    // Vérifier si l'utilisateur existe déjà
    const exists = await prisma.user.findFirst({
      where: { 
        OR: [
          { phone: String(phone) },
          ...(email ? [{ email: String(email).toLowerCase() }] : [])
        ] 
      },
    });

    if (exists) {
      return reply.status(409).send({ error: "Email ou téléphone déjà utilisé" });
    }

    // Hasher le mot de passe
    const passwordHash = await hashPassword(String(password));

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        name: String(name),
        email: email ? String(email).toLowerCase() : "",
        phone: String(phone),
        role,
        password: passwordHash,
        avatar: avatarFileName,

      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        createdAt: true
      }
    });

    // Générer les tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Sauvegarder le refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });

    return reply.status(201).send({
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone,
        avatar: user.avatar 
      },
      accessToken,
      refreshToken,
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de l'inscription:", error);
    
    // Gérer les erreurs spécifiques de Prisma
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return reply.status(409).send({
        error: `Un utilisateur avec ce ${field} existe déjà`
      });
    }

    return reply.status(500).send({ 
      error: "Erreur interne du serveur",
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};