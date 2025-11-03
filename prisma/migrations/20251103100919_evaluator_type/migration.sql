-- CreateEnum
CREATE TYPE "EvaluatorType" AS ENUM ('DIRECT_MANAGER', 'DIRECT_COLLEAGUE', 'PEER', 'OTHER');

-- AlterTable
ALTER TABLE "EvaluationParticipant" ADD COLUMN     "evaluatorType" "EvaluatorType";
