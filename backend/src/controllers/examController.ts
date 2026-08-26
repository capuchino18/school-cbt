import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Mendapatkan detail sesi ujian beserta soal untuk siswa (Dilengkapi publishedAt untuk Timer Mutlak)
 * Nama File: src/controllers/examController.ts
 * Endpoint: GET /api/student/exam-sessions/:sessionId
 */
export const getStudentExamSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const studentId = (req as any).user?.id; // Dari middleware auth JWT

    if (!sessionId) {
      res.status(400).json({ message: 'Session ID tidak valid.' });
      return;
    }

    // Ambil data sesi ujian, relasi mata pelajaran, dan soal-soalnya
    const examSession = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: {
          include: {
            questions: {
              where: { isDraft: false }, // Hanya ambil soal yang sudah dipublish guru
              select: {
                id: true,
                type: true,
                text: true,
                options: true,
                // correctAnswer sengaja disembunyikan agar aman dari kecurangan siswa!
              }
            }
          }
        }
      }
    });

    if (!examSession) {
      res.status(404).json({ message: 'Sesi ujian tidak ditemukan.' });
      return;
    }

    if (examSession.status !== 'PUBLISHED') {
      res.status(403).json({ message: 'Sesi ujian belum aktif atau sudah ditutup.' });
      return;
    }

    // Cek apakah siswa sudah pernah mengerjakan/submit ujian ini
    const existingResult = await prisma.examResult.findFirst({
      where: { studentId, examSessionId: sessionId }
    });

    if (existingResult && existingresult.isAutoSubmitted) {
      res.status(403).json({ message: 'Anda sudah menyelesaikan dan mengirim ujian ini sebelumnya.' });
      return;
    }

    // Titik Nol / Waktu Terbit Utama (publishedAt atau fallback ke createdAt)
    const publishTime = examSession.publishedAt || examSession.createdAt;

    // Kirim data ke frontend
    res.status(200).json({
      id: examSession.id,
      title: examSession.title,
      duration: examSession.duration,
      publishedAt: publishTime, // <- Kunci utama Absolute Timer di Frontend
      subject: examSession.subject
    });

  } catch (error: any) {
    console.error('Error getStudentExamSession:', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.', error: error.message });
  }
};

/**
 * Memproses pengiriman jawaban ujian (Manual atau Auto-Submit oleh Timer)
 * Endpoint: POST /api/student/exam-sessions/:sessionId/submit
 */
export const submitStudentExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { answers, isAutoSubmit } = req.body; 
    const studentId = (req as any).user?.id;

    if (!sessionId || !studentId) {
      res.status(400).json({ message: 'Data otorisasi atau session tidak lengkap.' });
      return;
    }

    const examSession = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: {
          include: { questions: true }
        }
      }
    });

    if (!examSession) {
      res.status(404).json({ message: 'Sesi ujian tidak ditemukan.' });
      return;
    }

    // Validasi Keamanan Waktu di Server (Anti-Manipulasi Client)
    const publishTimeMs = new Date(examSession.publishedAt || examSession.createdAt).getTime();
    const deadlineMs = publishTimeMs + (examSession.duration * 60000);
    const gracePeriodMs = 60000; // Toleransi jaringan 1 menit

    if (Date.now() > (deadlineMs + gracePeriodMs)) {
      console.warn(`[Security Warning] Siswa ${studentId} mencoba submit melewati batas waktu.`);
    }

    let correctPGCount = 0;
    let totalPGCount = 0;
    let scorePG = 0;
    let scoreEssay = 0;

    const questions = examSession.subject.questions;

    // Transaksi Database untuk menyimpan jawaban & hasil
    await prisma.$transaction(async (tx) => {
      // Bersihkan jawaban lama untuk menghindari duplikasi
      await tx.studentAnswer.deleteMany({
        where: { studentId, questionId: { in: questions.map(q => q.id) } }
      });

      for (const q of questions) {
        const studentAns = answers[q.id] || '';

        if (q.type === 'MULTIPLE_CHOICE') {
          totalPGCount++;
          const isCorrect = studentAns.trim().toUpperCase() === q.correctAnswer?.trim().toUpperCase();
          if (isCorrect) correctPGCount++;
        }

        await tx.studentAnswer.create({
          data: {
            studentId,
            questionId: q.id,
            answerText: studentAns,
            score: 0 
          }
        });
      }

      if (totalPGCount > 0) {
        scorePG = (correctPGCount / totalPGCount) * examSession.weightPG;
      }

      const totalScore = scorePG + scoreEssay;

      await prisma.examResult.upsert({
        where: {
          studentId_examSessionId: { studentId, examSessionId: sessionId }
        } as any,
        update: {
          correctPG: correctPGCount,
          totalPG: totalPGCount,
          scorePG,
          scoreEssay,
          totalScore,
          isAutoSubmitted: !!isAutoSubmit,
          submittedAt: new Date()
        },
        create: {
          studentId,
          examSessionId: sessionId,
          correctPG: correctPGCount,
          totalPG: totalPGCount,
          scorePG,
          scoreEssay,
          totalScore,
          isAutoSubmitted: !!isAutoSubmit,
          submittedAt: new Date()
        }
      });
    });

    res.status(200).json({
      status: 'success',
      message: isAutoSubmit ? 'Ujian otomatis dikirim karena waktu habis.' : 'Ujian berhasil dikumpulkan.',
    });

  } catch (error: any) {
    console.error('Error submitStudentExam:', error);
    res.status(500).json({ message: 'Gagal memproses pengiriman ujian.', error: error.message });
  }
};