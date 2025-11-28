

interface AnswerWithRelations {
  questionId: number;
  textAnswer: string | null;
  numericAnswer: number | null;
  question: {
    text: string;
    type: string;
    order: number;
    options?: Array<{ id: number; text: string; value: number }>;
  };
  selectedOption?: { id: number; text: string; value: number } | null;
  selectedOptions: Array<{
    option: { id: number; text: string; value: number };
  }>;
}

/**
 * Formater une réponse pour l'affichage ou le PDF
 */
export const formatAnswerText = (answer: AnswerWithRelations): string => {
  switch (answer.question.type) {
    case "TEXT":
      return answer.textAnswer || "";
    case "SCALE":
    case "NUMERIC":
      return answer.numericAnswer?.toString() || "";
    case "SINGLE_CHOICE":
      return answer.selectedOption?.text || "";
    case "MULTIPLE_CHOICE":
      return answer.selectedOptions.map((ao) => ao.option.text).join(", ");
    default:
      return "";
  }
};

/**
 * Formater un tableau de réponses pour le PDF
 */
export const formatAnswersForPDF = (answers: AnswerWithRelations[]) => {
  return answers.map((answer) => ({
    questionId: answer.questionId,
    questionText: answer.question.text,
    questionType: answer.question.type,
    answer: formatAnswerText(answer),
  }));
};

/**
 * Préparer les données d'une réponse pour la création/mise à jour
 */
export const prepareAnswerData = (
  answerInput: {
    questionId: number;
    selectedOptionId?: number;
    selectedOptionIds?: number[];
    textAnswer?: string;
    numericAnswer?: number;
  },
  evaluationId: number,
  isDraft: boolean
) => {
  return {
    evaluationId,
    selectedOptionId: answerInput.selectedOptionId ?? null,
    textAnswer: answerInput.textAnswer ?? null,
    numericAnswer:
      typeof answerInput.numericAnswer === "number"
        ? answerInput.numericAnswer
        : null,
    submittedAt: isDraft ? null : new Date(),
    isDraft,
  };
};
