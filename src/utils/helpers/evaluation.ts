/**
 * Evaluation-specific data enrichment helpers
 */

export interface EvaluationParticipant {
  participantRole: string;
  completedAt: Date | null;
  user?: any;
}

export interface EnrichedEvaluation {
  evaluatorsCount: number;
  completedEvaluators: number;
  progressPercentage: number;
}

/**
 * Calculate evaluation progress from participants
 */
export function calculateEvaluationProgress(
  participants: EvaluationParticipant[]
): EnrichedEvaluation {
  const evaluators = participants.filter(
    (p) => p.participantRole === "EVALUATOR"
  );
  
  const completedEvaluators = evaluators.filter(
    (e) => e.completedAt !== null
  ).length;

  const evaluatorsCount = evaluators.length;
  const progressPercentage = evaluatorsCount > 0 
    ? Math.round((completedEvaluators / evaluatorsCount) * 100)
    : 0;

  return {
    evaluatorsCount,
    completedEvaluators,
    progressPercentage,
  };
}

/**
 * Enrich evaluation data with progress information
 */
export function enrichEvaluationData<T extends { participants: EvaluationParticipant[] }>(
  evaluation: T
): T & EnrichedEvaluation {
  const progress = calculateEvaluationProgress(evaluation.participants);

  return {
    ...evaluation,
    ...progress,
  };
}

/**
 * Enrich multiple evaluations with progress information
 */
export function enrichEvaluationsData<T extends { participants: EvaluationParticipant[] }>(
  evaluations: T[]
): Array<T & EnrichedEvaluation> {
  return evaluations.map(enrichEvaluationData);
}

/**
 * Extract candidat from participants
 */
export function getCandidatFromParticipants(participants: EvaluationParticipant[]) {
  const candidat = participants.find((p) => p.participantRole === "CANDIDAT");
  
  if (!candidat || !candidat.user) return null;

  return {
    id: candidat.user.id,
    name: candidat.user.name,
    email: candidat.user.email,
  };
}

/**
 * Get evaluators from participants
 */
export function getEvaluatorsFromParticipants(participants: EvaluationParticipant[]) {
  return participants.filter((p) => p.participantRole === "EVALUATOR");
}

/**
 * Check if evaluation is completed
 */
export function isEvaluationCompleted(participants: EvaluationParticipant[]): boolean {
  const progress = calculateEvaluationProgress(participants);
  return progress.evaluatorsCount > 0 && 
         progress.completedEvaluators === progress.evaluatorsCount;
}
