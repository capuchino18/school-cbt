import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const calculateScore = async (resultId: string) => {
  const result = await prisma.examResult.findUnique({
    where: { id: resultId },
    include: { exam: { include: { questions: true } } }
  });

  if (!result) throw new Error("Sesi ujian tidak ditemukan");

  const answers = result.answers as Record<string, string>;
  const questions = result.exam.questions;
  
  let totalScore = 0;
  let maxScore = 0;

  questions.forEach((q) => {
    maxScore += q.points;
    if (answers[q.id] === q.correct_answer) {
      totalScore += q.points;
    }
  });

  const finalScore = (totalScore / maxScore) * 100;

  return await prisma.examResult.update({
    where: { id: resultId },
    data: { 
      score: finalScore,
      is_submitted: true 
    }
  });
};