import PDFDocument from "pdfkit";
import { Readable } from "stream";

interface QuestionAnswer {
  questionId: number;
  questionText: string;
  questionType: string;
  answer: string;
}

interface EvaluationData {
  evaluatorName: string;
  candidateName: string;
  evaluationRef: string;
  completedAt: Date;
  answers: QuestionAnswer[];
}

/**
 * Génère un PDF avec un tableau des réponses de l'évaluation
 */
export const generateEvaluationPDF = (data: EvaluationData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      // Créer un nouveau document PDF
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];

      // Collecter les données du PDF
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // En-tête du document
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Évaluation MADABEL", { align: "center" });

      doc.moveDown(0.5);

      // Informations générales
      doc.fontSize(12).font("Helvetica");
      doc.text(`Référence: ${data.evaluationRef}`, { align: "center" });
      doc.text(`Candidat évalué: ${data.candidateName}`, { align: "center" });
      doc.text(`Évaluateur: ${data.evaluatorName}`, { align: "center" });
      doc.text(
        `Date de complétion: ${data.completedAt.toLocaleDateString("fr-FR")} à ${data.completedAt.toLocaleTimeString("fr-FR")}`,
        { align: "center" }
      );

      doc.moveDown(2);

      // Titre du tableau
      doc.fontSize(14).font("Helvetica-Bold").text("Réponses au questionnaire");

      doc.moveDown(1);

      // Dessiner le tableau
      const tableTop = doc.y;
      const rowHeight = 30;
      const col1Width = 40; // N°
      const col2Width = 220; // Question
      const col3Width = 80; // Type
      const col4Width = 150; // Réponse

      let currentY = tableTop;

      // En-têtes du tableau
      doc.fontSize(10).font("Helvetica-Bold");

      // Bordures et fond de l'en-tête
      doc
        .fillColor("#4A5568")
        .rect(50, currentY, col1Width + col2Width + col3Width + col4Width, 25)
        .fill();

      doc.fillColor("white");
      doc.text("N°", 55, currentY + 8, { width: col1Width - 10 });
      doc.text("Question", 55 + col1Width, currentY + 8, {
        width: col2Width - 10,
      });
      doc.text("Type", 55 + col1Width + col2Width, currentY + 8, {
        width: col3Width - 10,
      });
      doc.text("Réponse", 55 + col1Width + col2Width + col3Width, currentY + 8, {
        width: col4Width - 10,
      });

      currentY += 25;

      // Lignes du tableau
      doc.fillColor("black").font("Helvetica");

      data.answers.forEach((item, index) => {
        // Vérifier si on a besoin d'une nouvelle page
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }

        const isEven = index % 2 === 0;
        if (isEven) {
          doc
            .fillColor("#F7FAFC")
            .rect(
              50,
              currentY,
              col1Width + col2Width + col3Width + col4Width,
              rowHeight
            )
            .fill();
        }

        doc.fillColor("black");

        // Numéro
        doc.text(`${index + 1}`, 55, currentY + 10, {
          width: col1Width - 10,
          align: "center",
        });

        // Question (avec retour à la ligne si nécessaire)
        const questionText =
          item.questionText.length > 80
            ? item.questionText.substring(0, 77) + "..."
            : item.questionText;
        doc.text(questionText, 55 + col1Width, currentY + 10, {
          width: col2Width - 10,
          height: rowHeight - 5,
        });

        // Type
        const typeLabels: { [key: string]: string } = {
          TEXT: "Texte",
          SINGLE_CHOICE: "Choix unique",
          MULTIPLE_CHOICE: "Choix multiple",
          SCALE: "Échelle",
          NUMERIC: "Numérique",
        };
        doc.text(
          typeLabels[item.questionType] || item.questionType,
          55 + col1Width + col2Width,
          currentY + 10,
          { width: col3Width - 10, height: rowHeight - 5 }
        );

        // Réponse (avec retour à la ligne si nécessaire)
        const answerText =
          item.answer.length > 60
            ? item.answer.substring(0, 57) + "..."
            : item.answer;
        doc.text(
          answerText,
          55 + col1Width + col2Width + col3Width,
          currentY + 10,
          { width: col4Width - 10, height: rowHeight - 5 }
        );

        // Bordures des cellules
        doc.strokeColor("#E2E8F0");
        doc
          .rect(
            50,
            currentY,
            col1Width + col2Width + col3Width + col4Width,
            rowHeight
          )
          .stroke();

        currentY += rowHeight;
      });

      // Pied de page
      doc.moveDown(3);
      doc
        .fontSize(8)
        .fillColor("#718096")
        .text(
          "Ce document est confidentiel et destiné uniquement à l'usage interne de MADABEL.",
          { align: "center" }
        );

      // Finaliser le PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export default generateEvaluationPDF;
