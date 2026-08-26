import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import Routes
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import teacherRoutes from './routes/teacherRoutes';

// Load Environment Variables
dotenv.config();

const app: Application = express();
const httpServer = createServer(app);

// Setup Socket.IO untuk Live Monitoring & Alarm
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// ----------------------------------------------------
// Register Routes (Wajib Terdaftar)
// ----------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);

// Basic Health Check Route (Explicitly defined)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'CBT Server is running properly', 
    timestamp: Date.now() 
  });
});

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log(`[Socket] User connected: ${socket.id}`);

  socket.on('JOIN_EXAM_ROOM', ({ sessionId, studentId }) => {
    socket.join(sessionId);
    console.log(`Student/Teacher joined room ${sessionId}`);
  });

  socket.on('STUDENT_VIOLATION_TRIGGERED', (data) => {
    socket.to(data.sessionId).emit('NEW_STUDENT_VIOLATION', data);
  });

  socket.on('RESET_STUDENT_ALARM', ({ sessionId, studentId }) => {
    io.to(sessionId).emit('TEACHER_RESET_VIOLATION', { studentId });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${socket.id}`);
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log('========================================');
  console.log(`🚀 CBT Server berjalan di http://localhost:${PORT}`);
  console.log('========================================');
});