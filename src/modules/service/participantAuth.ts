import { prisma } from "../../utils";
import { generatePassword, hashPassword } from "../auths/services";

/**
 * Générer et assigner un mot de passe temporaire à un utilisateur
 */
export const generateTemporaryPassword = async (
  userId: number
): Promise<string> => {
  const temporaryPassword = generatePassword(12);
  const hashedPassword = await hashPassword(temporaryPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return temporaryPassword;
};

/**
 * Obtenir les instructions de connexion pour un utilisateur
 */
export const getLoginInstructions = (
  email: string,
  isFirstLogin: boolean,
  temporaryPassword?: string
): { text: string; html: string } => {
  const frontendUrl = "https://evaluation.madabel.com/";
  const loginUrl = `${frontendUrl}/auth/login`;

  if (isFirstLogin && temporaryPassword) {
    return {
      text: `Pour vous connecter pour la première fois :
- Connectez-vous sur : ${loginUrl}
- Utilisez votre adresse email (${email}) comme identifiant
- Utilisez le mot de passe temporaire suivant : ${temporaryPassword}
- Nous vous recommandons de changer ce mot de passe après votre première connexion`,
      html: `<p><strong>Pour vous connecter pour la première fois :</strong></p>
<ol>
  <li>Connectez-vous sur : <a href="${loginUrl}" style="color: #007bff; text-decoration: none;">${loginUrl}</a></li>
  <li>Utilisez votre adresse email (<strong>${email}</strong>) comme identifiant</li>
  <li>Utilisez le mot de passe temporaire suivant : <strong style="background-color: #f0f0f0; padding: 5px 10px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</strong></li>
  <li>Nous vous recommandons de changer ce mot de passe après votre première connexion</li>
</ol>`,
    };
  }

  return {
    text: `Pour vous connecter :
- Connectez-vous sur : ${loginUrl}
- Utilisez votre adresse email (${email}) et votre mot de passe habituel`,
    html: `<p><strong>Pour vous connecter :</strong></p>
<ul>
  <li>Connectez-vous sur : <a href="${loginUrl}" style="color: #007bff; text-decoration: none;">${loginUrl}</a></li>
  <li>Utilisez votre adresse email (<strong>${email}</strong>) et votre mot de passe habituel</li>
</ul>`,
  };
};
