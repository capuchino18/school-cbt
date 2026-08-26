import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const updateExamTime = async (resultId: string, additionalMinutes: number) => {
  const result = await prisma.examResult.findUnique({
    where: { id: resultId },
    include: { examSession: true }
  });

  if (!result) throw new Error('Sesi ujian tidak ditemukan');
  if (result.submittedAt && result.isAutoSubmitted) throw new Error('Ujian sudah selesai');

  const session = result.examSession;
  
  // Kalkulasi waktu akhir baru pada tabel ExamSession
  const currentEndTime = session.endTime ? session.endTime.getTime() : Date.now();
  const newEndTime = new Date(currentEndTime + additionalMinutes * 60000);

  return await prisma.examSession.update({
    where: { id: session.id },
    data: {
      endTime: newEndTime,
      extraTime: session.extraTime + additionalMinutes,
    },
  });
};