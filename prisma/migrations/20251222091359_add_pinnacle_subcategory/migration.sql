-- CreateEnum
CREATE TYPE "PinnacleSubcategory" AS ENUM ('SOI', 'AUTRES');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "subcategory" "PinnacleSubcategory";
