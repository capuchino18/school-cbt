import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';

const prisma = new PrismaClient();

export function initAutoPublishScheduler(io: SocketIOServer) {
  // Menjalankan pengecekan setiap 1 menit sekali
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Cari semua sesi ujian berstatus DRAFT yang jadwal terbitnya sudah lewat atau sama dengan waktu sekarang
      const pendingSessions = await (prisma as any).examSession.findMany({
        where: {
          status: 'DRAFT',
          scheduledPublishAt: {
            lte: now
          }
        }
      });

      if (pendingSessions.length > 0) {
        for (const session of pendingSessions) {
          // Update status menjadi PUBLISHED secara otomatis di database
          await (prisma as any).examSession.update({
            where: { id: session.id },
            data: {
              status: 'PUBLISHED',
              publishedAt: now
            }
          });

          console.log(`🚀 [AUTO-PUBLISH] Sesi ujian "${session.title}" (ID: ${session.id}) berhasil diterbitkan otomatis.`);

          // Broadcast ke semua client (siswa/guru) secara real-time via Socket.IO agar tidak perlu refresh
          io.emit('EXAM_SESSION_PUBLISHED', {
            sessionId: session.id,
            title: session.title,
            publishedAt: now
          });
        }
      }
    } catch (error) {
      console.error('❌ [SCHEDULER ERROR] Gagal menjalankan auto-publish:', error);
    }
  });

  console.log('⚙️ [SCHEDULER SERVICE] Auto-Publish Exam Engine Berhasil Dijalankan.');
}