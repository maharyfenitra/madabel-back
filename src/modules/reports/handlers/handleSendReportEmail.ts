import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../utils";
import { sendEmail, generateReportPDF } from "../../service";

export const handleSendReportEmail = async (
  req: FastifyRequest<{
    Params: { evaluationId: string };
    Body: { candidatEmail: string; candidatName: string };
  }>,
  reply: FastifyReply
) => {
  try {
    const { evaluationId } = req.params;
    const { candidatEmail, candidatName } = req.body;
    const user = (req as any)?.user as { userId: number; role: string };

    if (!user) {
      return reply.status(401).send({ error: "Utilisateur non authentifié" });
    }

    // Seuls les ADMIN peuvent envoyer des rapports
    if (user.role !== "ADMIN") {
      return reply.status(403).send({
        error: "Accès refusé. Seuls les administrateurs peuvent envoyer des rapports.",
      });
    }

    // Récupérer l'évaluation avec toutes les données nécessaires pour le rapport
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: parseInt(evaluationId) },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true,
              },
              orderBy: { order: "asc" },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            answers: {
              include: {
                question: true,
                selectedOption: true,
                selectedOptions: {
                  include: { option: true },
                },
              },
            },
          },
        },
      },
    });

    if (!evaluation) {
      return reply.status(404).send({ error: "Évaluation introuvable" });
    }

    // Vérifier que tous les participants ont complété l'évaluation
    const allCompleted = evaluation.participants.every(
      (p) => p.completedAt !== null
    );

    if (!allCompleted) {
      return reply.status(400).send({
        error: "Tous les participants doivent avoir complété l'évaluation avant d'envoyer le rapport",
      });
    }

    if (!candidatEmail) {
      return reply.status(400).send({
        error: "Email du candidat non disponible",
      });
    }

    // Construire les données du rapport
    const reportData: Record<string, any> = {};
    const evaluators = evaluation.participants.filter(
      (p) => p.participantRole === "EVALUATOR"
    );
    const candidat = evaluation.participants.find(
      (p) => p.participantRole === "CANDIDAT"
    );

    // Calculer les statistiques globales
    let globalSum = 0;
    let globalCount = 0;
    let maxScore = -Infinity;
    let minScore = Infinity;

    // Traiter chaque question
    for (const question of evaluation.quiz!.questions) {
      const category = question.category;

      if (!reportData[category]) {
        reportData[category] = {
          name: category,
          description: getCategoryDescription(category),
          questions: [],
          scores: [],
        };
      }

      const answers = evaluators
        .map((participant) => {
          const answer = participant.answers.find(
            (a) => a.questionId === question.id
          );
          if (!answer) return null;

          return {
            participantId: participant.id,
            evaluatorType: participant.evaluatorType,
            answer: answer,
          };
        })
        .filter(Boolean);

      // Questions textuelles
      if (question.type === "TEXT") {
        const textAnswers = answers
          .map((a) => ({
            evaluatorType: a?.evaluatorType || "OTHER",
            evaluatorName: evaluators.find(e => e.id === a?.participantId)?.user?.name || "Anonyme",
            answer: a?.answer?.textAnswer || null,
          }))
          .filter((a) => a.answer);

        // Ajouter la réponse du candidat
        if (candidat) {
          const candidatAnswerData = candidat.answers.find(
            (a) => a.questionId === question.id
          );
          if (candidatAnswerData?.textAnswer) {
            textAnswers.push({
              evaluatorType: "CANDIDAT" as any,
              evaluatorName: candidat.user?.name || "Candidat",
              answer: candidatAnswerData.textAnswer,
            });
          }
        }

        reportData[category].questions.push({
          text: question.text,
          type: "TEXT",
          answers: textAnswers,
        });
        continue;
      }

      // Questions avec scores
      const validAnswers = answers.filter((a) => {
        if (question.type === "SCALE" && a!.answer.numericAnswer !== null) {
          return true;
        }
        if (question.type === "SINGLE_CHOICE" && a!.answer.selectedOption) {
          return true;
        }
        return false;
      });

      if (validAnswers.length === 0) continue;

      let overallSum = 0;
      let overallCount = 0;
      const averagesByType: Record<string, { sum: number; count: number }> = {};
      const countByType: Record<string, number> = {};

      for (const answerData of validAnswers) {
        let value: number | null = null;

        if (question.type === "SCALE") {
          value = answerData?.answer?.numericAnswer || null;
        } else if (question.type === "SINGLE_CHOICE" && answerData?.answer.selectedOption) {
          value = answerData.answer.selectedOption.value || 0;
        }

        if (value !== null) {
          overallSum += value;
          overallCount++;
          globalSum += value;
          globalCount++;

          if (value > maxScore) maxScore = value;
          if (value < minScore) minScore = value;

          const evaluatorType = answerData?.evaluatorType || "OTHER";
          if (!averagesByType[evaluatorType]) {
            averagesByType[evaluatorType] = { sum: 0, count: 0 };
          }
          if (!countByType[evaluatorType]) {
            countByType[evaluatorType] = 0;
          }
          averagesByType[evaluatorType].sum += value;
          averagesByType[evaluatorType].count++;
          countByType[evaluatorType]++;
        }
      }

      // Ajouter le score du candidat
      let candidatAnswer: number | null = null;
      if (candidat) {
        const candidatAnswerData = candidat.answers.find(
          (a) => a.questionId === question.id
        );
        if (candidatAnswerData) {
          if (question.type === "SCALE" && candidatAnswerData.numericAnswer !== null) {
            candidatAnswer = candidatAnswerData.numericAnswer;
          } else if (question.type === "SINGLE_CHOICE" && candidatAnswerData.selectedOption) {
            candidatAnswer = candidatAnswerData.selectedOption.value || 0;
          }

          if (candidatAnswer !== null) {
            if (!averagesByType["CANDIDAT"]) {
              averagesByType["CANDIDAT"] = { sum: 0, count: 0 };
            }
            if (!countByType["CANDIDAT"]) {
              countByType["CANDIDAT"] = 0;
            }
            averagesByType["CANDIDAT"].sum += candidatAnswer;
            averagesByType["CANDIDAT"].count++;
            countByType["CANDIDAT"]++;
            
            // Ajouter au calcul global
            overallSum += candidatAnswer;
            overallCount++;
            globalSum += candidatAnswer;
            globalCount++;
            
            if (candidatAnswer > maxScore) maxScore = candidatAnswer;
            if (candidatAnswer < minScore) minScore = candidatAnswer;
          }
        }
      }

      const overallAverage = overallCount > 0 ? overallSum / overallCount : null;
      const averagesByEvaluatorType: Record<string, number> = {};

      for (const [type, data] of Object.entries(averagesByType)) {
        if (data.count > 0) {
          averagesByEvaluatorType[type] = data.sum / data.count;
        }
      }

      reportData[category].questions.push({
        text: question.text,
        type: question.type,
        averageScore: overallAverage,
        averagesByType: averagesByEvaluatorType,
      });

      reportData[category].scores.push({
        overallAverage,
        averagesByType: averagesByEvaluatorType,
        countByType,
      });
    }

    // Calculer les moyennes par catégorie
    const categories = Object.values(reportData).map((cat: any) => {
      const scores = cat.scores.filter((s: any) => s.overallAverage !== null);
      
      let categoryOverallSum = 0;
      let categoryOverallCount = 0;
      const categoryAvgByType: Record<string, { sum: number; count: number }> = {};
      const categoryCountByType: Record<string, number> = {};

      for (const score of scores) {
        if (score.overallAverage !== null) {
          categoryOverallSum += score.overallAverage;
          categoryOverallCount++;
        }

        for (const [type, avg] of Object.entries(score.averagesByType)) {
          if (!categoryAvgByType[type]) {
            categoryAvgByType[type] = { sum: 0, count: 0 };
            categoryCountByType[type] = 0;
          }
          categoryAvgByType[type].sum += avg as number;
          categoryAvgByType[type].count++;
          categoryCountByType[type] = score.countByType[type] || 0;
        }
      }

      const categoryOverallAverage = categoryOverallCount > 0
        ? categoryOverallSum / categoryOverallCount
        : null;

      const categoryAverageByType: Record<string, number> = {};
      for (const [type, data] of Object.entries(categoryAvgByType)) {
        if (data.count > 0) {
          categoryAverageByType[type] = data.sum / data.count;
        }
      }

      return {
        name: cat.name,
        description: cat.description,
        questions: cat.questions,
        overallAverage: categoryOverallAverage,
        averageByType: categoryAverageByType,
        countByType: categoryCountByType,
      };
    });

    // Séparer les questions ouvertes
    const openQuestions = categories.flatMap((cat: any) =>
      cat.questions
        .filter((q: any) => q.type === "TEXT")
        .map((q: any) => ({
          text: q.text,
          answers: q.answers,
        }))
    );

    // Générer le PDF avec les données du rapport
    const pdfBuffer = await generateReportPDF({
      evaluation: {
        ref: evaluation.ref,
        deadline: evaluation.deadline,
      },
      candidatName: candidatName || "Candidat",
      report: {
        introduction: getIntroductionText(),
        globalStats: {
          overallAverage: globalCount > 0 ? globalSum / globalCount : null,
          totalResponses: globalCount,
          maxScore: maxScore === -Infinity ? null : maxScore,
          minScore: minScore === Infinity ? null : minScore,
        },
        categories: categories.filter((c: any) => c.questions.some((q: any) => q.type !== "TEXT")),
        openQuestions,
      },
    });

    // Préparer l'email
    const subject = `Votre rapport d'évaluation MADABEL - ${evaluation.ref}`;

    const text = `Cher ${candidatName || "Candidat"},

Nous avons le plaisir de vous informer que votre évaluation de leadership MADABEL (Réf: ${evaluation.ref}) est maintenant complète.

Tous les participants ont terminé leur évaluation et votre rapport est disponible en pièce jointe de cet email.

Le rapport contient :
- Une vue d'ensemble de vos résultats
- Les scores détaillés par catégorie de compétences
- Les commentaires et réponses des évaluateurs
- Une analyse complète de votre profil de leadership

Si vous avez des questions concernant votre rapport ou si vous souhaitez en discuter, n'hésitez pas à contacter l'équipe MADABEL à l'adresse admin@madabel.com.

Cordialement,
L'équipe Madabel`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Votre rapport d'évaluation MADABEL</h2>
        
        <p>Cher ${candidatName || "Candidat"},</p>
        
        <p>Nous avons le plaisir de vous informer que votre évaluation de leadership MADABEL <strong>(Réf: ${evaluation.ref})</strong> est maintenant complète.</p>
        
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>✓</strong> Tous les participants ont terminé leur évaluation</p>
          <p style="margin: 10px 0 0 0;"><strong>✓</strong> Votre rapport est disponible en pièce jointe</p>
        </div>
        
        <p>Le rapport contient :</p>
        <ul>
          <li>Une vue d'ensemble de vos résultats</li>
          <li>Les scores détaillés par catégorie de compétences</li>
          <li>Les commentaires et réponses des évaluateurs</li>
          <li>Une analyse complète de votre profil de leadership</li>
        </ul>
        
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #6B7280;">
          Si vous avez des questions concernant votre rapport ou si vous souhaitez en discuter, 
          n'hésitez pas à contacter l'équipe MADABEL à l'adresse 
          <a href="mailto:admin@madabel.com" style="color: #4F46E5;">admin@madabel.com</a>.
        </p>
        
        <p style="font-size: 12px; color: #6B7280;">
          Cordialement,<br>
          L'équipe Madabel
        </p>
      </div>
    `;

    // Envoyer l'email avec le PDF en pièce jointe
    const success = await sendEmail({
      to: candidatEmail,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `Rapport_MADABEL_${evaluation.ref}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    if (!success) {
      return reply.status(500).send({
        error: "Erreur lors de l'envoi de l'email",
      });
    }

    return reply.status(200).send({
      success: true,
      message: `Rapport envoyé avec succès à ${candidatEmail}`,
    });
  } catch (error: any) {
    console.error("Erreur envoi rapport par email:", error);
    return reply.status(500).send({
      error: "Erreur lors de l'envoi du rapport par email",
      details: error.message,
    });
  }
};

// Fonctions helper
function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    "Affirmation de soi": "Capacité à exprimer ses opinions et à défendre ses idées de manière constructive.",
    "Développement des autres": "Aptitude à accompagner et faire progresser les membres de l'équipe.",
    "Vision stratégique": "Capacité à définir une direction claire et à anticiper les évolutions.",
    "Gestion du changement": "Compétence à conduire et accompagner les transformations.",
    "Communication": "Aptitude à transmettre efficacement l'information et à écouter.",
  };
  return descriptions[category] || "";
}

function getIntroductionText(): string {
  return `Ce rapport présente les résultats de votre évaluation de leadership MADABEL. Il compile les réponses de l'ensemble des participants (managers, pairs, subordonnés et votre auto-évaluation) pour vous offrir une vision complète de vos compétences en leadership.

Les scores sont présentés sur une échelle de 1 à 7, où 7 représente le niveau le plus élevé. Les résultats sont organisés par catégorie de compétences pour faciliter l'analyse et l'identification des axes de développement.`;
}

export default handleSendReportEmail;
