/*
  Warnings:

  - You are about to drop the column `isAvailable` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isOnline` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "isAvailable",
DROP COLUMN "isOnline",
DROP COLUMN "latitude",
DROP COLUMN "longitude";
