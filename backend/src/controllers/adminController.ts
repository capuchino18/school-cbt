import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { Parser } from 'json2csv';

const prisma = new PrismaClient();

// Monitoring Siswa
export const getExamMonitoring = async (req: AuthRequest, res: Response) => {
  const { examId } = req.params;
  try {
    const monitoringData = await prisma.examResult.findMany({
      where: { exam_id: examId },
      include: { student: { select: { name: true, username: true } } }
    });
    res.status(200).json(monitoringData);
  } catch (error) {
    res.status(500).json({ error: "Gagal memuat monitoring" });
  }
};

// Tambah Waktu Real-Time
export const addExtraTime = async (req: AuthRequest, res: Response) => {
  const { resultId } = req.params;
  const { additional_minutes } = req.body;
  try {
    const current = await prisma.examResult.findUnique({ where: { id: resultId } });
    if (!current) return res.status(404).json({ error: "Data sesi tidak ditemukan" });

    const newEndTime = new Date(current.actual_end_time.getTime() + additional_minutes * 60000);

    const updated = await prisma.examResult.update({
      where: { id: resultId },
      data: {
        extra_time_mins: current.extra_time_mins + additional_minutes,
        actual_end_time: newEndTime
      }
    });
    res.status(200).json({ message: "Waktu berhasil ditambah", updated });
  } catch (error) {
    res.status(500).json({ error: "Gagal menambah waktu" });
  }
};

// Ekspor Nilai ke CSV/Excel
export const exportExamResults = async (req: AuthRequest, res: Response) => {
  const { examId } = req.params;
  try {
    const results = await prisma.examResult.findMany({
      where: { exam_id: examId },
      include: { 
        student: { select: { name: true, username: true } },
        exam: { select: { title: true } }
      }
    });

    const dataToExport = results.map((item) => ({
      'Nama Siswa': item.student.name,
      'Username / NIS': item.student.username,
      'Judul Ujian': item.exam.title,
      'Skor Akhir': item.score ?? 0,
      'Status': item.is_submitted ? 'Selesai' : 'Belum Selesai',
      'Waktu Mulai': new Date(item.started_at).toLocaleString('id-ID'),
    }));

    const fields = ['Nama Siswa', 'Username / NIS', 'Judul Ujian', 'Skor Akhir', 'Status', 'Waktu Mulai'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(dataToExport);

    res.header('Content-Type', 'text/csv');
    res.attachment(`rekap_nilai_${examId}.csv`);
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ error: "Gagal mengekspor data" });
  }
};