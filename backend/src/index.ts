import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import { OAuth2Client } from 'google-auth-library';
import cron from 'node-cron';
import { initAutoPublishScheduler } from './services/scheduler';

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

// ==========================================
// 1. MIDDLEWARE SETUP
// ==========================================
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ==========================================
// 2. HTTP SERVER & SOCKET.IO INITIALIZATION
// ==========================================
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('io', io);

export interface AuthRequest extends Request {
  user?: any;
}

// ==========================================
// 3. HEALTH CHECK & PUBLIC LANDING API
// ==========================================
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'CBT Server is running properly', 
    timestamp: Date.now() 
  });
});

// Endpoint Publik untuk Landing Page Stats
app.get('/api/public/stats', async (req: Request, res: Response) => {
  try {
    const teacherCount = await (prisma.user as any).count({ where: { role: 'TEACHER' } });
    const studentCount = await (prisma.user as any).count({ where: { role: 'STUDENT' } });
    
    // Hitung total ujian yang sudah dilaksanakan (akumulasi history permanen + sesi saat ini)
    const currentSessionsCount = await (prisma.examSession as any).count();
    const statsLog = await (prisma as any).globalStatsLog.findFirst();
    const totalExamsExecuted = (statsLog ? statsLog.totalExamFinished : 0) + currentSessionsCount;

    res.json({
      teacherCount,
      studentCount,
      totalExamsExecuted
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Gagal memuat statistik publik', details: err.message });
  }
});

// Endpoint Publik Kirim Kritik & Saran
app.post('/api/public/feedback', async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Semua kolom kritik & saran wajib diisi!' });
    }

    const feedback = await (prisma as any).feedback.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        message: String(message).trim()
      }
    });

    res.status(201).json({ message: 'Kritik dan saran berhasil dikirim. Terima kasih!', feedback });
  } catch (err: any) {
    res.status(400).json({ message: 'Gagal mengirim kritik dan saran', details: err.message });
  }
});

// ==========================================
// 4. REAL-TIME SOCKET.IO ENGINE
// ==========================================
io.on('connection', (socket: Socket) => {
  socket.on('JOIN_EXAM_ROOM', ({ sessionId, studentId }: { sessionId: string; studentId?: string }) => {
    socket.join(`exam_room_${sessionId}`);
    socket.join(`teacher_room_${sessionId}`);
  });

  socket.on('STUDENT_VIOLATION_TRIGGERED', async (data: { sessionId: string; studentId: string; reason: string }) => {
    try {
      const violation = await (prisma as any).examViolation.create({
        data: {
          studentId: data.studentId,
          examSessionId: data.sessionId,
          reason: data.reason || 'Meninggalkan Layar / Pindah Tab Ujian',
          isAlarmActive: true
        },
        include: { student: { select: { id: true, name: true, username: true } } }
      });

      io.to(`exam_room_${data.sessionId}`).emit('STUDENT_VIOLATION_ALERT', {
        studentId: data.studentId,
        reason: data.reason,
        createdAt: violation.createdAt,
        isAlarmActive: true,
      });

      io.to(`teacher_room_${data.sessionId}`).emit('NEW_STUDENT_VIOLATION', violation);
    } catch (err) {
      console.error('Gagal menyimpan log pelanggaran:', err);
    }
  });

  socket.on('TEACHER_RESET_VIOLATION', (data: { sessionId: string; targetStudentId: string }) => {
    io.to(`exam_room_${data.sessionId}`).emit('TEACHER_RESET_VIOLATION', { targetStudentId: data.targetStudentId });
  });
});

// ==========================================
// 5. BACKGROUND AUTO-PURGE SERVICE (CRON JOB)
// ==========================================
function initAutoPurgeCronJob() {
  cron.schedule('0 2 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const expiredSessions = await (prisma as any).examSession.findMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
        select: { id: true }
      });
      if (expiredSessions.length === 0) return;
      
      const expiredSessionIds = expiredSessions.map((s: any) => s.id);
      
      // Catat akumulasi ke GlobalStatsLog sebelum dihapus agar data statistik ujian dilaksanakan tetap abadi
      let statsLog = await (prisma as any).globalStatsLog.findFirst();
      if (!statsLog) {
        statsLog = await (prisma as any).globalStatsLog.create({ data: { totalExamFinished: expiredSessionIds.length } });
      } else {
        await (prisma as any).globalStatsLog.update({
          where: { id: statsLog.id },
          data: { totalExamFinished: statsLog.totalExamFinished + expiredSessionIds.length }
        });
      }

      await prisma.$transaction(async (tx: any) => {
        await tx.studentAnswer.deleteMany({ where: { question: { subject: { examSessions: { some: { id: { in: expiredSessionIds } } } } } } });
        await tx.examViolation.deleteMany({ where: { examSessionId: { in: expiredSessionIds } } });
        await tx.examResult.deleteMany({ where: { examSessionId: { in: expiredSessionIds } } });
        await tx.examSession.deleteMany({ where: { id: { in: expiredSessionIds } } });
      });
    } catch (error) {
      console.error('CRON ERROR:', error);
    }
  });
}

const getAdminWhitelist = (): string[] => {
  const rawEnv = process.env.ADMIN_WHITELIST_EMAILS || '';
  return rawEnv.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
};

const sanitize = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\s+/g, ' ').trim().toLowerCase();
};

async function getOrCreateSubjectForTeacher(teacherId: string, rawName: string) {
  const cleanName = rawName.trim();
  const normalizedCode = cleanName.toUpperCase().replace(/\s+/g, '_');
  let subject = await (prisma as any).subject.findFirst({
    where: { teacherId, name: { equals: cleanName, mode: 'insensitive' } }
  });
  if (!subject) {
    subject = await (prisma as any).subject.create({
      data: { teacherId, name: cleanName, code: `${normalizedCode}_${teacherId.slice(0, 5)}` }
    });
  }
  return subject;
}

const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token otentikasi tidak ditemukan' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const dbUser = await (prisma.user as any).findUnique({ where: { id: decoded.id } });
    if (!dbUser) return res.status(401).json({ message: 'Pengguna tidak ditemukan' });
    if (dbUser.isBanned) return res.status(403).json({ message: 'Akun dibekukan.' });
    req.user = dbUser;
    next();
  } catch (err: any) {
    return res.status(403).json({ message: 'Token tidak valid' });
  }
};

const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    next();
  };
};

// ==========================================
// 6. AUTHENTICATION API ENDPOINTS
// ==========================================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }
    const identifier = String(username).trim().toLowerCase();

    const allUsers = await (prisma.user as any).findMany();
    const user = allUsers.find((u: any) => {
      const dbUsername = String(u.username || '').toLowerCase();
      const dbEmail = String(u.email || '').toLowerCase();
      const usernamePrefix = dbUsername.split('@')[0];
      const emailPrefix = dbEmail.split('@')[0];

      return (
        dbUsername === identifier ||
        dbEmail === identifier ||
        usernamePrefix === identifier ||
        emailPrefix === identifier
      );
    });

    if (!user) return res.status(401).json({ message: 'Username atau password salah' });
    if (user.isBanned) return res.status(403).json({ message: 'Akun dibekukan.' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: 'Username atau password salah' });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    return res.json({ token, role: user.role, name: user.name, userId: user.id, className: user.className || '' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error', details: error.message });
  }
});

app.post('/api/auth/register-teacher', async (req: Request, res: Response) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Semua kolom wajib diisi!' });
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    const existingUsername = await (prisma.user as any).findFirst({
      where: { username: { equals: cleanUsername, mode: 'insensitive' } }
    });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username sudah digunakan oleh pengguna lain. Silakan gunakan username yang berbeda.' });
    }

    const existingEmail = await (prisma.user as any).findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } }
    });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email sudah terdaftar. Silakan gunakan email lain.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminWhitelist = getAdminWhitelist();
    const role = adminWhitelist.includes(cleanEmail) ? 'ADMIN' : 'TEACHER';

    const newTeacher = await (prisma.user as any).create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        name: String(name).trim(),
        role: role
      }
    });

    res.status(201).json({ message: 'Registrasi pengajar berhasil!', user: newTeacher });
  } catch (err: any) {
    res.status(400).json({ message: 'Gagal mendaftarkan pengajar', details: err.message });
  }
});

app.get('/api/auth/google', (req: Request, res: Response) => {
  res.redirect('http://localhost:3000/login?google_auth=required');
});

app.post('/api/auth/google-teacher-login', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ message: 'Google Auth Gagal' });

    const userEmail = payload.email.toLowerCase();
    const userName = payload.name || 'Pengajar Google';
    const isAdmin = getAdminWhitelist().includes(userEmail);
    const targetRole = isAdmin ? 'ADMIN' : 'TEACHER';

    let user = await (prisma.user as any).findFirst({
      where: { email: userEmail }
    });

    if (!user) {
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await (prisma.user as any).create({
        data: { username: null, email: userEmail, name: userName, password: randomPassword, role: targetRole }
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    return res.json({ token, role: user.role, name: user.name, userId: user.id });
  } catch (error: any) {
    return res.status(401).json({ message: 'Verifikasi Google Gagal', details: error.message });
  }
});

// ==========================================
// 7. ADMIN & TEACHER APIs (Termasuk Feedback Admin)
// ==========================================

app.get('/api/admin/users', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const users = await (prisma.user as any).findMany({
      where: { role: 'TEACHER' },
      select: { 
        id: true, 
        username: true, 
        email: true, 
        name: true, 
        className: true, 
        role: true, 
        isBanned: true, 
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedUsers = await Promise.all(users.map(async (u: any) => {
      let studentCount = await (prisma.user as any).count({ where: { teacherId: u.id, role: 'STUDENT' } });
      let examSessionCount = await (prisma.examSession as any).count({ where: { teacherId: u.id } });
      return {
        ...u,
        studentCount,
        examSessionCount,
        registeredAtFormatted: u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Tanggal Tidak Tercatat'
      };
    }));

    res.json(enrichedUsers);
  } catch (err: any) {
    res.status(500).json({ message: 'Gagal mengambil data monitoring admin', details: err.message });
  }
});

// Endpoint Admin untuk melihat Kritik & Saran
app.get('/api/admin/feedbacks', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const feedbacks = await (prisma as any).feedback.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(feedbacks);
  } catch (err: any) {
    res.status(500).json({ message: 'Gagal mengambil data kritik dan saran', details: err.message });
  }
});

app.put('/api/admin/users/:id/ban', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res: Response) => {
  const { isBanned } = req.body;
  const updated = await (prisma.user as any).update({ where: { id: req.params.id }, data: { isBanned: Boolean(isBanned) } });
  res.json({ message: 'Status user diubah', updated });
});

app.get('/api/teacher/students', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const whereCondition: any = { role: 'STUDENT' };
    if (req.user.role === 'TEACHER') {
      whereCondition.teacherId = req.user.id;
    }
    const students = await (prisma.user as any).findMany({
      where: whereCondition,
      select: { id: true, username: true, email: true, name: true, className: true, isBanned: true, createdAt: true },
      orderBy: { name: 'asc' }
    });
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ message: 'Gagal mengambil data siswa', details: err.message });
  }
});

app.post('/api/teacher/students', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name, className } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Username, password, dan nama siswa wajib diisi!' });
    }

    const cleanUsername = String(username).trim();

    const existingStudentUsername = await (prisma.user as any).findFirst({
      where: { username: { equals: cleanUsername, mode: 'insensitive' } }
    });
    if (existingStudentUsername) {
      return res.status(400).json({ message: `Username "${cleanUsername}" sudah digunakan oleh orang lain. Guru wajib menginput username yang berbeda.` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await (prisma.user as any).create({
      data: { 
        username: cleanUsername, 
        email: `${cleanUsername.toLowerCase()}@school.cbt`, 
        password: hashedPassword, 
        name: String(name).trim(), 
        className, 
        role: 'STUDENT', 
        teacherId: req.user.id 
      }
    });

    res.status(201).json({ message: 'Siswa berhasil ditambahkan', student });
  } catch (err: any) {
    res.status(400).json({ message: 'Gagal menambahkan siswa', details: err.message });
  }
});

app.delete('/api/teacher/students/:id', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  await (prisma.user as any).delete({ where: { id: req.params.id } });
  res.json({ message: 'Siswa dihapus' });
});

app.post('/api/teacher/questions/batch', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const { subjectName, questions } = req.body;
  const subject = await getOrCreateSubjectForTeacher(req.user.id, subjectName);
  await (prisma as any).question.deleteMany({ where: { teacherId: req.user.id, subjectId: subject.id } });

  const data = questions.map((q: any) => ({
    teacherId: req.user.id,
    subjectId: subject.id,
    type: q.type || 'MULTIPLE_CHOICE',
    text: String(q.text || '').trim(),
    options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []),
    correctAnswer: String(q.correctAnswer || '').trim(),
  }));

  await (prisma as any).question.createMany({ data });
  res.status(201).json({ message: 'Soal disimpan' });
});

app.post('/api/teacher/exam-sessions', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const { title, subjectName, duration, questionMode, weightPG, weightEssay, scheduledPublishAt, status, targetClasses } = req.body;
  const subject = await getOrCreateSubjectForTeacher(req.user.id, subjectName);
  const publishDate = status === 'PUBLISHED' ? (scheduledPublishAt ? new Date(scheduledPublishAt) : new Date()) : null;
  const durationMin = parseInt(duration) || 60;

  const session = await (prisma as any).examSession.create({
    data: {
      teacherId: req.user.id,
      title: title || subject.name,
      subjectId: subject.id,
      duration: durationMin,
      questionMode: questionMode || 'HYBRID',
      weightPG: weightPG ?? 70,
      weightEssay: weightEssay ?? 30,
      targetClasses: targetClasses || [],
      scheduledPublishAt: publishDate,
      publishedAt: publishDate,
      status: status || 'DRAFT',
      startTime: publishDate || new Date(),
      endTime: new Date((publishDate || new Date()).getTime() + durationMin * 60000)
    }
  });
  res.status(201).json(session);
});

app.get('/api/teacher/exam-sessions', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const sessions = await (prisma as any).examSession.findMany({
    where: { teacherId: req.user.id },
    include: { subject: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(sessions);
});

app.get('/api/teacher/exam-sessions/:id/questions', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const session = await (prisma as any).examSession.findFirst({
    where: { id: req.params.id },
    include: { subject: { include: { questions: true } } }
  });
  if (!session) return res.status(404).json({ message: 'Sesi tidak ditemukan' });
  const questions = (session.subject?.questions || []).map((q: any) => ({
    ...q,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
  }));
  res.json({ session, questions });
});

app.put('/api/teacher/exam-sessions/:id/schedule', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const publishDate = new Date(req.body.scheduledPublishAt);
  const existing = await (prisma as any).examSession.findUnique({ where: { id: req.params.id } });
  const updated = await (prisma as any).examSession.update({
    where: { id: req.params.id },
    data: { scheduledPublishAt: publishDate, publishedAt: publishDate, startTime: publishDate, endTime: new Date(publishDate.getTime() + (existing.duration || 60) * 60000), status: 'PUBLISHED' }
  });
  res.json(updated);
});

app.delete('/api/teacher/exam-sessions/:id', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  // Sebelum menghapus sesi, tambahkan hitungan ke GlobalStatsLog agar data statistik ujian dilaksanakan tetap terhitung abadi
  let statsLog = await (prisma as any).globalStatsLog.findFirst();
  if (!statsLog) {
    await (prisma as any).globalStatsLog.create({ data: { totalExamFinished: 1 } });
  } else {
    await (prisma as any).globalStatsLog.update({
      where: { id: statsLog.id },
      data: { totalExamFinished: statsLog.totalExamFinished + 1 }
    });
  }

  await (prisma as any).examSession.delete({ where: { id: req.params.id } });
  res.json({ message: 'Sesi dihapus' });
});

app.get('/api/teacher/exam-results/:sessionId', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const results = await (prisma as any).examResult.findMany({
    where: { examSessionId: req.params.sessionId },
    include: { student: { select: { id: true, name: true, username: true, className: true } } }
  });
  res.json(results);
});

app.delete('/api/teacher/exam-results/clear/:sessionId', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  await (prisma as any).examResult.deleteMany({ where: { examSessionId: req.params.sessionId } });
  res.json({ message: 'Riwayat dibersihkan' });
});

app.get('/api/teacher/export-results/:sessionId', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const results = await (prisma as any).examResult.findMany({
    where: { examSessionId: req.params.sessionId },
    include: { student: true }
  });
  const data = results.map((r: any, i: number) => ({
    No: i + 1,
    Nama: r.student?.name,
    Username: r.student?.username,
    Kelas: r.student?.className,
    TotalSkor: r.totalScore
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nilai');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

app.get('/api/teacher/exam-sessions/:id/monitoring', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const violations = await (prisma as any).examViolation.findMany({
    where: { examSessionId: req.params.id },
    include: { student: { select: { id: true, name: true, username: true, className: true } } }
  });
  res.json(violations);
});

app.post('/api/teacher/exam-sessions/:id/add-time', authenticate, authorize(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  const mins = parseInt(req.body.minutes) || 0;
  const ses = await (prisma as any).examSession.findUnique({ where: { id: req.params.id } });
  const updated = await (prisma as any).examSession.update({
    where: { id: req.params.id },
    data: { extraTime: { increment: mins }, endTime: new Date(new Date(ses.endTime).getTime() + mins * 60000) }
  });
  res.json(updated);
});

// ==========================================
// 8. STUDENT APIs
// ==========================================
app.get('/api/student/exam-sessions', authenticate, authorize(['STUDENT']), async (req: AuthRequest, res: Response) => {
  const studentClass = String(req.user.className || '').trim().toLowerCase();
  const now = new Date();
  const sessions = await (prisma as any).examSession.findMany({
    where: { OR: [{ status: 'PUBLISHED' }, { scheduledPublishAt: { lte: now } }] },
    include: { subject: true, examResults: { where: { studentId: req.user.id } } }
  });
  const filtered = sessions.filter((s: any) => {
    let targets = s.targetClasses;
    if (typeof targets === 'string') { try { targets = JSON.parse(targets); } catch (e) { targets = [targets]; } }
    if (Array.isArray(targets) && targets.length > 0) {
      if (!studentClass) return false;
      return targets.some((c: string) => String(c).trim().toLowerCase() === studentClass);
    }
    return true;
  });
  res.json(filtered.map((s: any) => ({ ...s, isSubmitted: s.examResults.length > 0 })));
});

app.get('/api/student/exam-sessions/:sessionId', authenticate, authorize(['STUDENT']), async (req: AuthRequest, res: Response) => {
  const session = await (prisma as any).examSession.findUnique({
    where: { id: req.params.sessionId },
    include: { subject: { include: { questions: true } } }
  });
  res.json(session);
});

app.post('/api/student/exam-sessions/:sessionId/submit', authenticate, authorize(['STUDENT']), async (req: AuthRequest, res: Response) => {
  const { answers } = req.body;
  const session = await (prisma as any).examSession.findUnique({
    where: { id: req.params.sessionId },
    include: { subject: { include: { questions: true } } }
  });

  let correct = 0;
  let total = 0;
  for (const q of session.subject.questions) {
    if (q.type === 'MULTIPLE_CHOICE') {
      total++;
      if (sanitize(answers[q.id]) === sanitize(q.correctAnswer)) correct++;
    }
  }
  const scorePG = total > 0 ? (correct / total) * 100 : 0;
  const result = await (prisma as any).examResult.create({
    data: { studentId: req.user.id, examSessionId: session.id, correctPG: correct, totalPG: total, scorePG, totalScore: scorePG }
  });
  res.json({ message: 'Berhasil dikirim', result });
});

// ==========================================
// 9. START SERVER
// ==========================================
server.listen(PORT, () => {
  console.log(`CBT Server berjalan di http://localhost:${PORT}`);
  initAutoPublishScheduler(io);
  initAutoPurgeCronJob();
});