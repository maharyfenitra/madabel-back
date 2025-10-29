/*
  Warnings:

  - The values [CLIENT,DRIVER,SUPER_ADMIN] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Pricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ride` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Transfer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'EVALUATOR', 'EVALUATED');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EVALUATED';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Pricing" DROP CONSTRAINT "Pricing_driverId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Pricing" DROP CONSTRAINT "Pricing_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ride" DROP CONSTRAINT "Ride_clientId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ride" DROP CONSTRAINT "Ride_driverId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ride" DROP CONSTRAINT "Ride_transferId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ride" DROP CONSTRAINT "Ride_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_accountId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transfer" DROP CONSTRAINT "Transfer_fromTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transfer" DROP CONSTRAINT "Transfer_toTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Vehicle" DROP CONSTRAINT "Vehicle_ownerId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EVALUATED';

-- DropTable
DROP TABLE "public"."Account";

-- DropTable
DROP TABLE "public"."Message";

-- DropTable
DROP TABLE "public"."Pricing";

-- DropTable
DROP TABLE "public"."Ride";

-- DropTable
DROP TABLE "public"."Transaction";

-- DropTable
DROP TABLE "public"."Transfer";

-- DropTable
DROP TABLE "public"."Vehicle";

-- DropEnum
DROP TYPE "public"."RideStatus";

-- DropEnum
DROP TYPE "public"."TransactionType";

-- DropEnum
DROP TYPE "public"."VehicleType";
