-- AlterTable
ALTER TABLE "schedule_slots" ADD COLUMN IF NOT EXISTS "teacher" TEXT;
ALTER TABLE "schedule_slots" ADD COLUMN IF NOT EXISTS "group" TEXT;
