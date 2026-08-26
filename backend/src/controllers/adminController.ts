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
      where: { examSessionId: examId },
      include: { student: { select: { name: true, username: true } } }
    });
    res.status(200).json(monitoringData);
  } catch (error) {
    res.status(500).json({ error: "Gagal memuat monitoring" });
  }
};

// Tambah Waktu Real-Time (Update disesuaikan ke ExamSession karena Result tidak memiliki extra_time)
export const addExtraTime = async (req: AuthRequest, res: Response) => {
  const { resultId } = req.params;
  const { additional_minutes } = req.body;
  try {
    const currentResult = await prisma.examResult.findUnique({ 
      where: { id: resultId },
      include: { examSession: true }
    });
    
    if (!currentResult) return res.status(404).json({ error: "Data sesi tidak ditemukan" });

    const session = currentResult.examSession;
    const currentEndTime = session.endTime ? session.endTime.getTime() : Date.now();
    const newEndTime = new Date(currentEndTime + additional_minutes * 60000);

    const updated = await prisma.examSession.update({
      where: { id: session.id },
      data: {
        extraTime: session.extraTime + additional_minutes,
        endTime: newEndTime
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
      where: { examSessionId: examId },
      include: { 
        student: { select: { name: true, username: true } },
        examSession: { select: { title: true, startTime: true } }
      }
    });

    const dataToExport = results.map((item) => ({
      'Nama Siswa': item.student.name,
      'Username / NIS': item.student.username,
      'Judul Ujian': item.examSession.title,
      'Skor Akhir': item.totalScore ?? 0,
      'Status': item.submittedAt ? 'Selesai' : 'Belum Selesai',
      'Waktu Mulai': item.examSession.startTime ? new Date(item.examSession.startTime).toLocaleString('id-ID') : '-',
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

// -------------------------------------------------------------
// STUB FUNCTIONS UNTUK MENCEGAH ERROR DI adminRoutes.ts
// (Anda dapat melengkapi logic ini nanti sesuai kebutuhan)
// -------------------------------------------------------------
export const createQuestion = async (req: AuthRequest, res: Response) => { 
  res.status(501).json({ message: "Fitur Create Question belum diimplementasi" }); 
};
export const getQuestionsByExam = async (req: AuthRequest, res: Response) => { 
  res.status(501).json({ message: "Fitur Get Questions belum diimplementasi" }); 
};
export const updateQuestion = async (req: AuthRequest, res: Response) => { 
  res.status(501).json({ message: "Fitur Update Question belum diimplementasi" }); 
};
export const deleteQuestion = async (req: AuthRequest, res: Response) => { 
  res.status(501).json({ message: "Fitur Delete Question belum diimplementasi" }); 
};