import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 Vérification des données...\n');

  const userCount = await prisma.user.count();
  console.log(`👥 Utilisateurs: ${userCount}`);

  const quizCount = await prisma.quiz.count();
  console.log(`📜 Quiz: ${quizCount}`);

  const questionCount = await prisma.question.count();
  console.log(`❓ Questions: ${questionCount}`);

  const evaluationCount = await prisma.evaluation.count();
  console.log(`📊 Évaluations: ${evaluationCount}`);

  const answerCount = await prisma.answer.count();
  console.log(`📝 Réponses: ${answerCount}`);

  // Lister les utilisateurs
  const users = await prisma.user.findMany({ select: { name: true, email: true, role: true } });
  console.log('\n👥 Liste des utilisateurs:');
  users.forEach(user => console.log(`  - ${user.name} (${user.email}) - ${user.role}`));

  // Lister les questions par catégorie
  const questions = await prisma.question.findMany({
    select: { text: true, category: true, type: true },
    orderBy: { order: 'asc' }
  });
  console.log('\n❓ Liste des questions:');
  questions.forEach(q => console.log(`  - [${q.category}] ${q.text} (${q.type})`));

  await prisma.$disconnect();
}

checkData().catch(console.error);