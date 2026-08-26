import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const updateExamTime = async (resultId: string, additionalMinutes: number) => {
  const result = await prisma.examResult.findUnique({
    where: { id: resultId },
  });

  if (!result) throw new Error('Sesi ujian tidak ditemukan');
  if (result.is_submitted) throw new Error('Ujian sudah selesai');

  // Kalkulasi waktu akhir baru
  const newEndTime = new Date(result.actual_end_time.getTime() + additionalMinutes * 60000);

  return await prisma.examResult.update({
    where: { id: resultId },
    data: {
      actual_end_time: newEndTime,
      extra_time_mins: result.extra_time_mins + additionalMinutes,
    },
  });
};