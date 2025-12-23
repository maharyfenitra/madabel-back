-- AlterEnum
-- Migrate existing data first
UPDATE "Question" SET category = 'PRODUCTION' WHERE category = 'SUMMIT' OR category = 'DEVELOPMENT_OF_OTHERS';

-- Create new enum type
CREATE TYPE "QuestionCategory_new" AS ENUM ('POSITION', 'PERMISSION', 'PRODUCTION', 'PINNACLE');

-- Alter the column to use the new enum
ALTER TABLE "Question" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Question" ALTER COLUMN "category" TYPE "QuestionCategory_new" USING ("category"::text::"QuestionCategory_new");
ALTER TABLE "Question" ALTER COLUMN "category" SET DEFAULT 'PRODUCTION';

-- Drop old enum and rename new one
DROP TYPE "QuestionCategory";
ALTER TYPE "QuestionCategory_new" RENAME TO "QuestionCategory";
