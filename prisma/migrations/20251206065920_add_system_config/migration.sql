-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('HOURLY_1', 'HOURLY_2', 'DAILY_1', 'DAILY_3', 'WEEKLY_1');

-- CreateTable
CREATE TABLE "system_config" (
    "id" SERIAL NOT NULL,
    "reminderFrequency" "ReminderFrequency" NOT NULL DEFAULT 'DAILY_1',
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastReminderCheck" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);
