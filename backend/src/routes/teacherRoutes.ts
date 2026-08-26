import { Router } from 'express';
import { 
  getTeacherStudents, 
  createStudentByTeacher, 
  deleteStudentByTeacher 
} from '../controllers/teacherController';

const router = Router();

// Middleware verifikasi token sederhana atau gunakan middleware auth yang sudah ada di project Anda
const verifyTokenMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token otorisasi tidak ditemukan.' });
  }
  
  // Jika project Anda menggunakan middleware auth terpisah, Anda bisa menggantinya.
  // Di sini kita teruskan request (asumsi decoding token ditangani controller/middleware global).
  next();
};

// Endpoint Kelola Siswa oleh Guru
router.get('/students', verifyTokenMiddleware, getTeacherStudents);
router.post('/students', verifyTokenMiddleware, createStudentByTeacher);
router.delete('/students/:id', verifyTokenMiddleware, deleteStudentByTeacher);

export default router;