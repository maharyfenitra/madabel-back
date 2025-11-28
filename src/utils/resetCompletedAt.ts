import { prisma } from "./index";

/**
 * Script pour réinitialiser le champ completedAt des évaluations marquées par erreur
 * À exécuter avec: npx tsx src/utils/resetCompletedAt.ts
 */
async function resetCompletedAt() {
  try {
    console.log("Réinitialisation des évaluations marquées comme complétées...");
    
    const result = await prisma.evaluationParticipant.updateMany({
      where: {
        completedAt: {
          not: null
        },
        participantRole: "EVALUATOR"
      },
      data: {
        completedAt: null
      }
    });

    console.log(`✅ ${result.count} évaluation(s) réinitialisée(s)`);
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetCompletedAt();
