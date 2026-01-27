import PDFDocument from "pdfkit";

interface ReportData {
  evaluation: {
    ref: string;
    deadline: Date;
  };
  candidatName: string;
  report: any;
}

/**
 * Génère un PDF de rapport d'évaluation MADABEL
 */
export const generateReportPDF = (data: ReportData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // En-tête du document
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .fillColor("#4F46E5")
        .text("RAPPORT D'ÉVALUATION MADABEL", { align: "center" });

      doc.moveDown(0.5);

      // Informations générales
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#000000")
        .text(`Référence: ${data.evaluation.ref}`, { align: "center" });
      
      doc.text(`Candidat: ${data.candidatName}`, { align: "center" });
      
      doc.text(
        `Date limite: ${new Date(data.evaluation.deadline).toLocaleDateString("fr-FR")}`,
        { align: "center" }
      );

      doc.moveDown(2);

      // Ligne de séparation
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor("#E5E7EB")
        .stroke();

      doc.moveDown(1);

      // Introduction
      if (data.report.introduction) {
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#1F2937")
          .text("INTRODUCTION");

        doc.moveDown(0.5);

        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#374151")
          .text(data.report.introduction, {
            align: "justify",
            lineGap: 2,
          });

        doc.moveDown(1.5);
      }

      // Statistiques globales
      if (data.report.globalStats) {
        const stats = data.report.globalStats;
        
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#1F2937")
          .text("STATISTIQUES GLOBALES");

        doc.moveDown(0.5);

        const startY = doc.y;
        const colWidth = 245;
        
        // Colonne 1
        doc.fontSize(10).font("Helvetica");
        doc.text(`Score global moyen: ${stats.overallAverage?.toFixed(2) || "N/A"}`, 50, startY);
        doc.text(`Nombre total de réponses: ${stats.totalResponses || 0}`, 50, startY + 15);
        
        // Colonne 2
        doc.text(`Score maximum: ${stats.maxScore?.toFixed(2) || "N/A"}`, 50 + colWidth, startY);
        doc.text(`Score minimum: ${stats.minScore?.toFixed(2) || "N/A"}`, 50 + colWidth, startY + 15);

        doc.moveDown(3);
      }

      // Scores par catégorie
      if (data.report.categories && data.report.categories.length > 0) {
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#1F2937")
          .text("SCORES PAR CATÉGORIE");

        doc.moveDown(0.5);

        data.report.categories.forEach((category: any, index: number) => {
          // Vérifier si on a besoin d'une nouvelle page
          if (doc.y > 700) {
            doc.addPage();
          }

          // Nom de la catégorie
          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor("#4F46E5")
            .text(`${index + 1}. ${category.name}`);

          doc.moveDown(0.3);

          // Description si disponible
          if (category.description) {
            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#6B7280")
              .text(category.description, {
                align: "justify",
                lineGap: 1,
              });

            doc.moveDown(0.3);
          }

          // Scores
          doc.fontSize(10).font("Helvetica").fillColor("#000000");

          if (category.averageByType) {
            const types = [
              { key: "MANAGER", label: "Manager" },
              { key: "PAIR", label: "Pairs" },
              { key: "SUBORDONNES", label: "Subordonnés" },
              { key: "AUTRES", label: "Autres" },
              { key: "CANDIDAT", label: "Soi" },
            ];

            types.forEach((type) => {
              const avg = category.averageByType[type.key];
              const count = category.countByType?.[type.key] || 0;
              if (avg !== undefined && avg !== null) {
                doc.text(
                  `  ${type.label}: ${avg.toFixed(2)} (${count} participant${count > 1 ? "s" : ""})`,
                  { indent: 10 }
                );
              }
            });
          }

          if (category.overallAverage !== undefined) {
            doc
              .font("Helvetica-Bold")
              .text(`  Moyenne générale: ${category.overallAverage.toFixed(2)}`, {
                indent: 10,
              });
          }

          doc.moveDown(1);

          // Questions de la catégorie
          if (category.questions && category.questions.length > 0) {
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor("#374151")
              .text("Questions:");

            doc.moveDown(0.3);

            category.questions.forEach((question: any, qIndex: number) => {
              if (doc.y > 720) {
                doc.addPage();
              }

              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor("#000000")
                .text(`${qIndex + 1}. ${question.text}`, { indent: 15 });

              if (question.averageScore !== undefined) {
                doc
                  .fontSize(8)
                  .fillColor("#6B7280")
                  .text(`   Score moyen: ${question.averageScore.toFixed(2)}`, {
                    indent: 20,
                  });
              }

              doc.moveDown(0.3);
            });
          }

          doc.moveDown(1);
        });
      }

      // Questions ouvertes
      if (data.report.openQuestions && data.report.openQuestions.length > 0) {
        doc.addPage();

        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("#1F2937")
          .text("QUESTIONS OUVERTES");

        doc.moveDown(1);

        data.report.openQuestions.forEach((q: any, index: number) => {
          if (doc.y > 650) {
            doc.addPage();
          }

          doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .fillColor("#4F46E5")
            .text(`${index + 1}. ${q.text}`);

          doc.moveDown(0.5);

          if (q.answers && q.answers.length > 0) {
            q.answers.forEach((answer: any, aIndex: number) => {
              if (doc.y > 720) {
                doc.addPage();
              }

              const evaluatorLabel =
                answer.evaluatorType === "CANDIDAT"
                  ? "Candidat"
                  : answer.evaluatorName || `Évaluateur ${aIndex + 1}`;

              doc
                .fontSize(9)
                .font("Helvetica-Bold")
                .fillColor("#374151")
                .text(`${evaluatorLabel}:`, { indent: 10 });

              doc
                .fontSize(9)
                .font("Helvetica")
                .fillColor("#000000")
                .text(answer.answer || "Pas de réponse", {
                  indent: 15,
                  align: "justify",
                });

              doc.moveDown(0.5);
            });
          } else {
            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#6B7280")
              .text("Aucune réponse", { indent: 10 });
          }

          doc.moveDown(1);
        });
      }

      // Pied de page sur chaque page
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        doc
          .fontSize(8)
          .font("Helvetica")
          .fillColor("#9CA3AF")
          .text(
            `Page ${i + 1} / ${pageCount}`,
            50,
            doc.page.height - 30,
            { align: "center" }
          );

        doc.text(
          `Rapport MADABEL - ${data.evaluation.ref}`,
          50,
          doc.page.height - 30,
          { align: "left" }
        );

        doc.text(
          new Date().toLocaleDateString("fr-FR"),
          50,
          doc.page.height - 30,
          { align: "right" }
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
