import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { hashPassword } from "../services";

export const handleResetPassword = async (
  req: FastifyRequest<{ Body: { token: string; newPassword: string } }>,
  reply: FastifyReply
) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return reply.status(400).send({
        error: "Token et nouveau mot de passe requis",
      });
    }

    // Validation du mot de passe
    if (newPassword.length < 6) {
      return reply.status(400).send({
        error: "Le mot de passe doit contenir au moins 6 caractères",
      });
    }

    // Rechercher le token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return reply.status(400).send({
        error: "Token de réinitialisation invalide",
      });
    }

    // Vérifier si le token a déjà été utilisé
    if (resetToken.used) {
      return reply.status(400).send({
        error: "Ce lien de réinitialisation a déjà été utilisé",
      });
    }

    // Vérifier si le token a expiré
    if (new Date() > resetToken.expiresAt) {
      return reply.status(400).send({
        error: "Ce lien de réinitialisation a expiré",
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await hashPassword(newPassword);

    // Mettre à jour le mot de passe de l'utilisateur
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Marquer le token comme utilisé
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Supprimer tous les refresh tokens de l'utilisateur pour forcer une reconnexion
    await prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    });

    return reply.status(200).send({
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (error: any) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return reply.status(500).send({
      error: "Erreur lors de la réinitialisation du mot de passe",
      details: error.message,
    });
  }
};
