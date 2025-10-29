import path from "path";
import fs from "fs";

export const upload = async (
  file: any,
  folder: string = "avatars"
): Promise<string> => {
  try {
    if (!file) throw new Error("Aucun fichier à uploader");

    // Récupérer le buffer
    const buffer: Buffer =
      typeof file.toBuffer === "function"
        ? await file.toBuffer()
        : file.value;

    if (!buffer) throw new Error("Impossible de lire le contenu du fichier");

    // Nom unique du fichier
    const ext = path.extname(file.filename || "");
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    // ✅ Chemin propre basé sur la racine du projet
    const dirPath = path.join(process.cwd(), "public", folder);
    const filePath = path.join(dirPath, fileName);

    // Création du dossier si nécessaire
    fs.mkdirSync(dirPath, { recursive: true });

    // Écriture du fichier
    fs.writeFileSync(filePath, buffer);

    console.log(`✅ Fichier sauvegardé : ${filePath}`);
    return fileName;
  } catch (err) {
    console.error("❌ Erreur upload :", err);
    throw err;
  }
};
