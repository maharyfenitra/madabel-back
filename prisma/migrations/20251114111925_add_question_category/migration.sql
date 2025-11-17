-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('POSITION', 'PERMISSION', 'PRODUCTION', 'DEVELOPMENT_OF_OTHERS', 'SUMMIT');

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "evaluationId" INTEGER,
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "category" "QuestionCategory" NOT NULL DEFAULT 'SUMMIT';

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
