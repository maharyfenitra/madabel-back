/**
 * Generate evaluation reminder email content
 */
export function createEvaluationReminderEmail(
  participantName: string,
  candidatName: string,
  evaluationRef: string,
  evaluationId: number
): { subject: string; text: string; html: string } {
  const subject = `Rappel: Evaluation de ${candidatName} en attente`;
  const evaluationUrl = `https://evaluation.madabel.com/modules/evaluations/${evaluationId}`;

  const text = `Bonjour ${participantName},

Nous vous rappelons que vous avez une evaluation en attente pour ${candidatName}.

Reference de l'evaluation : ${evaluationRef}

Veuillez completer cette evaluation dans les meilleurs delais.

Pour acceder a l'evaluation, connectez-vous sur :
${evaluationUrl}

Merci de votre participation.

Cordialement,
L'equipe MADABEL`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #EAB308;">🔔 Rappel : Evaluation en attente</h2>
      <p>Bonjour <strong>${participantName}</strong>,</p>
      <p>Nous vous rappelons que vous avez une evaluation en attente pour <strong>${candidatName}</strong>.</p>
      <div style="background-color: #FEF3C7; padding: 15px; border-left: 4px solid #EAB308; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Reference :</strong> ${evaluationRef}</p>
      </div>
      <p>Veuillez completer cette evaluation dans les meilleurs delais.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${evaluationUrl}" style="background-color: #EAB308; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Completer l'evaluation
        </a>
      </div>
      <p style="margin-top: 20px;">Merci de votre participation.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">L'equipe MADABEL</p>
    </div>
  `;

  return { subject, text, html };
}
