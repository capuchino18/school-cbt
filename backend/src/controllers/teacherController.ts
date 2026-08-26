import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Mendapatkan daftar siswa yang didaftarkan oleh guru yang sedang login
 * Endpoint: GET /api/teacher/students
 */
export const getTeacherStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = (req as any).user?.id; // ID Guru dari Middleware Auth JWT

    if (!teacherId) {
      res.status(401).json({ message: 'Otorisasi gagal, silakan login ulang.' });
      return;
    }

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        teacherId: teacherId, // Isolasi data: Hanya ambil siswa milik guru ini
      },
      select: {
        id: true,
        name: true,
        username: true,
        className: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(students);
  } catch (error: any) {
    console.error('Error getTeacherStudents:', error);
    res.status(500).json({ message: 'Gagal memuat daftar siswa.', error: error.message });
  }
};

/**
 * Mendaftarkan akun siswa baru oleh guru (Termasuk Kelas)
 * Endpoint: POST /api/teacher/students
 */
export const createStudentByTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = (req as any).user?.id;
    const { name, username, password, className } = req.body;

    if (!teacherId) {
      res.status(401).json({ message: 'Otorisasi gagal, silakan login ulang.' });
      return;
    }

    if (!name || !username || !password) {
      res.status(400).json({ message: 'Nama, username, dan password wajib diisi.' });
      return;
    }

    // Normalisasi username ke huruf kecil tanpa spasi
    const cleanUsername = username.trim().toLowerCase();

    // Validasi apakah username sudah terdaftar secara global di database
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (existingUser) {
      res.status(400).json({ 
        message: `Username/NISP '${username}' sudah terdaftar dalam sistem. Gunakan username lain.` 
      });
      return;
    }

    // Hash password sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan siswa baru ke database
    const newStudent = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        password: hashedPassword,
        className: className ? className.trim() : null,
        role: 'STUDENT',
        teacherId: teacherId, 
      },
      select: {
        id: true,
        name: true,
        username: true,
        className: true,
        createdAt: true,
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Akun siswa berhasil didaftarkan.',
      data: newStudent,
    });

  } catch (error: any) {
    console.error('Error createStudentByTeacher:', error);
    res.status(500).json({ message: 'Gagal mendaftarkan siswa.', error: error.message });
  }
};

/**
 * Menghapus akun siswa
 * Endpoint: DELETE /api/teacher/students/:id
 */
export const deleteStudentByTeacher = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = (req as any).user?.id;
    const { id } = req.params;

    if (!teacherId) {
      res.status(401).json({ message: 'Otorisasi gagal.' });
      return;
    }

    const student = await prisma.user.findFirst({
      where: { id, teacherId, role: 'STUDENT' }
    });

    if (!student) {
      res.status(404).json({ message: 'Siswa tidak ditemukan atau Anda tidak memiliki hak akses.' });
      return;
    }

    await prisma.user.delete({
      where: { id }
    });

    res.status(200).json({
      status: 'success',
      message: 'Akun siswa berhasil dihapus.',
    });

  } catch (error: any) {
    console.error('Error deleteStudentByTeacher:', error);
    res.status(500).json({ message: 'Gagal menghapus siswa.', error: error.message });
  }
};