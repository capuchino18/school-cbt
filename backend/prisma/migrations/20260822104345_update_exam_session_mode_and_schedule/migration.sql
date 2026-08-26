/*
  Warnings:

  - You are about to drop the column `actual_end_time` on the `ExamResult` table. All the data in the column will be lost.
  - You are about to drop the column `answers` on the `ExamResult` table. All the data in the column will be lost.
  - You are about to drop the column `exam_id` on the `ExamResult` table. All the data in the column will be lost.
  - You are about to drop the column `extra_time_mins` on the `ExamResult` table. All the data in the column will be lost.
  - You are about to drop the column `is_submitted` on the `ExamResult` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `ExamResult` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `ExamResult` table. All the data in the column will be lost.
  - You are about to drop the column `student_id` on the `ExamResult` table. All the data in the column will be lost.
  - You are about to drop the column `correct_answer` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `exam_id` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `question_text` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Exam` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `examSessionId` to the `ExamResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentId` to the `ExamResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectId` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'ESSAY');

-- CreateEnum
CREATE TYPE "QuestionMode" AS ENUM ('PG_ONLY', 'ESSAY_ONLY', 'HYBRID');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- DropForeignKey
ALTER TABLE "ExamResult" DROP CONSTRAINT "ExamResult_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "ExamResult" DROP CONSTRAINT "ExamResult_student_id_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_exam_id_fkey";

-- AlterTable
ALTER TABLE "ExamResult" DROP COLUMN "actual_end_time",
DROP COLUMN "answers",
DROP COLUMN "exam_id",
DROP COLUMN "extra_time_mins",
DROP COLUMN "is_submitted",
DROP COLUMN "score",
DROP COLUMN "started_at",
DROP COLUMN "student_id",
ADD COLUMN     "correctPG" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "examSessionId" TEXT NOT NULL,
ADD COLUMN     "scoreEssay" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "scorePG" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "studentId" TEXT NOT NULL,
ADD COLUMN     "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "totalPG" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "correct_answer",
DROP COLUMN "exam_id",
DROP COLUMN "points",
DROP COLUMN "question_text",
ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isDraft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subjectId" TEXT NOT NULL,
ADD COLUMN     "text" TEXT NOT NULL,
ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
ALTER COLUMN "options" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "Exam";

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "extraTime" INTEGER NOT NULL DEFAULT 0,
    "questionMode" "QuestionMode" NOT NULL DEFAULT 'HYBRID',
    "weightPG" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "weightEssay" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "scheduledPublishAt" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAnswer" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamViolation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examSessionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAnswer" ADD CONSTRAINT "StudentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResult" ADD CONSTRAINT "ExamResult_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamViolation" ADD CONSTRAINT "ExamViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamViolation" ADD CONSTRAINT "ExamViolation_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
