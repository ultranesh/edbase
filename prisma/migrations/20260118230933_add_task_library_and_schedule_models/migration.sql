-- CreateEnum
CREATE TYPE "TeacherCategory" AS ENUM ('INTERN', 'NO_CATEGORY', 'FIRST_CATEGORY', 'HIGHEST_CATEGORY', 'EXPERT');

-- CreateEnum
CREATE TYPE "GradeLevel" AS ENUM ('GRADE_0', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6', 'GRADE_7', 'GRADE_8', 'GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADUATE');

-- CreateEnum
CREATE TYPE "LanguageOfStudy" AS ENUM ('KAZAKH', 'RUSSIAN', 'ENGLISH');

-- CreateEnum
CREATE TYPE "StudyGoal" AS ENUM ('CC', 'ENT', 'IELTS', 'AFTERSCHOOL', 'SCHOOL_PREP', 'SAT', 'NUET', 'COMPREHENSIVE');

-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('MATHEMATICS', 'LOGIC', 'KAZAKH', 'RUSSIAN', 'ENGLISH', 'NATURAL_SCIENCE', 'ALGEBRA', 'GEOMETRY', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'HISTORY_KZ', 'GEOGRAPHY', 'WORLD_HISTORY');

-- CreateEnum
CREATE TYPE "TaskFormat" AS ENUM ('NISH', 'BIL', 'RFMSH', 'ENT', 'OLYMPIAD', 'SAT');

-- CreateEnum
CREATE TYPE "Guarantee" AS ENUM ('NONE', 'FIFTY_PERCENT', 'EIGHTY_PERCENT', 'HUNDRED_PERCENT');

-- CreateEnum
CREATE TYPE "StudyFormat" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PaymentPlan" AS ENUM ('ONE_TRANCHE', 'TWO_TRANCHES', 'THREE_TRANCHES');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StudentStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "StudentStatus" ADD VALUE 'FROZEN';
ALTER TYPE "StudentStatus" ADD VALUE 'REFUND';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "bonusMonths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "careerOrientationResult" TEXT,
ADD COLUMN     "coordinatorId" TEXT,
ADD COLUMN     "firstDiagnosticId" TEXT,
ADD COLUMN     "freezeDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "freezeEndDate" TIMESTAMP(3),
ADD COLUMN     "gradeLevel" "GradeLevel",
ADD COLUMN     "guarantee" "Guarantee",
ADD COLUMN     "intensiveMonths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "languageOfStudy" "LanguageOfStudy",
ADD COLUMN     "monthlyPayment" DOUBLE PRECISION,
ADD COLUMN     "parentName" TEXT,
ADD COLUMN     "parentPhone" TEXT,
ADD COLUMN     "paymentPlan" "PaymentPlan",
ADD COLUMN     "school" TEXT,
ADD COLUMN     "standardMonths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "studyEndDate" TIMESTAMP(3),
ADD COLUMN     "studyFormat" "StudyFormat",
ADD COLUMN     "studyGoal" "StudyGoal",
ADD COLUMN     "studyStartDate" TIMESTAMP(3),
ADD COLUMN     "subjects" "Subject"[],
ADD COLUMN     "totalAmount" DOUBLE PRECISION,
ADD COLUMN     "tranche1Amount" DOUBLE PRECISION,
ADD COLUMN     "tranche1Date" TIMESTAMP(3),
ADD COLUMN     "tranche2Amount" DOUBLE PRECISION,
ADD COLUMN     "tranche2Date" TIMESTAMP(3),
ADD COLUMN     "tranche3Amount" DOUBLE PRECISION,
ADD COLUMN     "tranche3Date" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "branches" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "category" "TeacherCategory" DEFAULT 'NO_CATEGORY',
ADD COLUMN     "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 15,
    "equipment" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKz" TEXT,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "icon" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_topics" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKz" TEXT,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "icon" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_subtopics" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKz" TEXT,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_subtopics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "subtopicId" TEXT NOT NULL,
    "format" "TaskFormat" NOT NULL,
    "difficultyLevel" "DifficultyLevel" NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionImage" TEXT,
    "answerText" TEXT,
    "answerImage" TEXT,
    "solutionText" TEXT,
    "solutionImage" TEXT,
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "points" INTEGER NOT NULL DEFAULT 1,
    "timeEstimate" INTEGER,
    "createdBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_slots" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "groupId" TEXT,
    "teacherId" TEXT,
    "subject" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "color" TEXT,
    "notes" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_branchId_name_key" ON "classrooms"("branchId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "task_subjects_name_key" ON "task_subjects"("name");

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_topics" ADD CONSTRAINT "task_topics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "task_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_subtopics" ADD CONSTRAINT "task_subtopics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "task_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "task_subtopics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
