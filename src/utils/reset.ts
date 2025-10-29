import { PrismaClient } from "../../generated/prisma";

export const prisma = new PrismaClient();

async function resetMessageId() {
  // Mettre seq à 20 pour que la prochaine insertion ait id = 21
  await prisma.$executeRawUnsafe(`
    UPDATE sqlite_sequence SET seq = 21 WHERE name = 'Message';
  `);
  console.log("ID de Message réinitialisé à 20 ✅");
}

resetMessageId()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
