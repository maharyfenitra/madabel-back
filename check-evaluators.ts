import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function checkEvaluators() {
  console.log('🔍 Vérification des evaluatorType des participants...\n');

  const participants = await prisma.evaluationParticipant.findMany({
    include: {
      user: { select: { name: true, email: true } },
      evaluation: { select: { ref: true } }
    }
  });

  console.log(`Total participants: ${participants.length}\n`);

  participants.forEach(p => {
    console.log(`Evaluation: ${p.evaluation.ref}`);
    console.log(`  User: ${p.user.name} (${p.user.email})`);
    console.log(`  Role: ${p.participantRole}`);
    console.log(`  EvaluatorType: ${p.evaluatorType || 'NULL'}`);
    console.log('---');
  });

  // Compter par evaluatorType
  const byType: Record<string, number> = {};
  participants.forEach(p => {
    const type = p.evaluatorType || 'NULL';
    byType[type] = (byType[type] || 0) + 1;
  });

  console.log('\n📊 Répartition par evaluatorType:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  await prisma.$disconnect();
}

checkEvaluators();
