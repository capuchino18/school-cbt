import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * PURGE ENGINE (Pembersih Data Lapuk > 30 Hari)
 * Berjalan otomatis setiap hari pukul 02:00 Pagi (Low-Traffic Hours)
 */
export function initAutoPurgeCronJob(): void {
  // Pattern Cron: "0 2 * * *" -> Menjalankan fungsi tiap pukul 02:00 malam
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 [CRON JOB] Memulai proses pembersihan data ujian lapuk (> 30 Hari)...');
    
    try {
      // Hitung ambang batas waktu (30 Hari yang lalu)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 1. Cari Sesi Ujian yang berusia lebih dari 30 hari
      const expiredSessions = await (prisma as any).examSession.findMany({
        where: {
          createdAt: { lt: thirtyDaysAgo }
        },
        select: { id: true, title: true }
      });

      if (expiredSessions.length === 0) {
        console.log('✅ [CRON JOB] Tidak ada data ujian lapuk yang perlu dibersihkan.');
        return;
      }

      const expiredSessionIds = expiredSessions.map((s: any) => s.id);

      // 2. Transaksi Hapus Atomic untuk Menjaga Integritas Database
      await prisma.$transaction(async (tx: any) => {
        // A. Hapus Jawaban Detail Siswa
        const deletedAnswers = await tx.studentAnswer.deleteMany({
          where: {
            question: {
              subject: {
                examSessions: {
                  some: { id: { in: expiredSessionIds } }
                }
              }
            },
            createdAt: { lt: thirtyDaysAgo }
          }
        });

        // B. Hapus Log Pelanggaran Ujian
        const deletedViolations = await tx.examViolation.deleteMany({
          where: { examSessionId: { in: expiredSessionIds } }
        });

        // C. Hapus Hasil Ringkasan Nilai Ujian
        const deletedResults = await tx.examResult.deleteMany({
          where: { examSessionId: { in: expiredSessionIds } }
        });

        // D. Hapus Sesi Ujian
        const deletedSessions = await tx.examSession.deleteMany({
          where: { id: { in: expiredSessionIds } }
        });

        console.log(`🚀 [CRON JOB SUCCESS] Berhasil membersihkan:
          - ${deletedSessions.count} Sesi Ujian Kedaluwarsa
          - ${deletedResults.count} Ringkasan Hasil Ujian
          - ${deletedAnswers.count} Detail Jawaban Siswa
          - ${deletedViolations.count} Log Pelanggaran
        `);
      });

    } catch (error) {
      console.error('❌ [CRON JOB ERROR] Gagal menjalankan pembersihan data:', error);
    }
  });

  console.log('⚙️ [CRON SERVICE] Auto-Purge Engine (30-Day Data Retention) Berhasil Diaktifkan.');
}