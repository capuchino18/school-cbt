import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const calculateScore = async (resultId: string) => {
  const result = await prisma.examResult.findUnique({
    where: { id: resultId },
    include: { 
      examSession: { 
        include: { subject: { include: { questions: true } } } 
      } 
    }
  });

  if (!result) throw new Error("Sesi ujian tidak ditemukan");

  // Mengambil jawaban siswa dari tabel terpisah (StudentAnswer)
  const studentAnswers = await prisma.studentAnswer.findMany({
    where: { studentId: result.studentId }
  });
  
  const questions = result.examSession.subject.questions;
  
  let correctPG = 0;
  let totalPG = 0;

  questions.forEach((q) => {
    if (q.type === 'MULTIPLE_CHOICE') {
      totalPG++;
      const ans = studentAnswers.find(a => a.questionId === q.id);
      if (ans && ans.answerText === q.correctAnswer) {
        correctPG++;
      }
    }
  });

  // Kalkulasi nilai Pilihan Ganda (PG)
  const weightPG = result.examSession.weightPG || 70;
  const scorePG = totalPG > 0 ? (correctPG / totalPG) * weightPG : 0;
  
  // Ambil nilai essay yang sudah ada (jika ada) dan jumlahkan
  const scoreEssay = result.scoreEssay || 0;
  const totalScore = scorePG + scoreEssay;

  return await prisma.examResult.update({
    where: { id: resultId },
    data: { 
      correctPG,
      totalPG,
      scorePG,
      totalScore,
      isAutoSubmitted: true,
      submittedAt: new Date()
    }
  });
};