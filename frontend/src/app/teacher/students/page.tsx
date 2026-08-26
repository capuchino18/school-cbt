'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import SpaceBackground from '@/components/SpaceBackground';

interface Student {
  id: string;
  name: string;
  username: string;
  className?: string;
  createdAt: string;
}

export default function TeacherStudentsPage() {
  const [teacherName, setTeacherName] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State Tambah Siswa
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [className, setClassName] = useState('');

  const getAuthHeader = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/teacher/students', getAuthHeader());
      setStudents(res.data);
    } catch (err: any) {
      console.error('Fetch students error:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || err.response?.data?.details || 'Gagal mengambil data siswa.' 
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const storedName = localStorage.getItem('name');
    const token = localStorage.getItem('token');

    if (!token || (role !== 'TEACHER' && role !== 'ADMIN')) {
      window.location.href = '/login';
      return;
    }

    if (storedName) setTeacherName(storedName);
    fetchStudents();
  }, [fetchStudents]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/teacher/students', {
        name,
        username,
        password,
        className
      }, getAuthHeader());

      setMessage({ type: 'success', text: 'Akun siswa berhasil ditambahkan.' });
      setName('');
      setUsername('');
      setPassword('');
      setClassName('');
      fetchStudents();
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || err.response?.data?.details || 'Gagal menambah siswa.' 
      });
    }
  };

  const handleDeleteStudent = async (id: string, studentName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus siswa ${studentName}?`)) return;

    try {
      await axios.delete(`http://localhost:5000/api/teacher/students/${id}`, getAuthHeader());
      setMessage({ type: 'success', text: 'Siswa berhasil dihapus.' });
      fetchStudents();
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || err.response?.data?.details || 'Gagal menghapus siswa.' 
      });
    }
  };

  return (
    <SpaceBackground>
      <div className="min-h-screen text-slate-100 p-6 md:p-10 relative z-10">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="flex justify-between items-center bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
            <div className="flex items-center space-x-4">
              <Link 
                href="/teacher/dashboard" 
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl transition border border-slate-700"
              >
                ← Kembali
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-white">Kelola Akun Siswa &amp; Kelas</h1>
                <p className="text-slate-400 text-xs mt-0.5">Tambah, ubah, dan pantau data peserta ujian beserta kelasnya</p>
              </div>
            </div>
            {teacherName && (
              <span className="text-xs font-semibold px-3.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                {teacherName}
              </span>
            )}
          </header>

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-semibold border ${
              message.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Pendaftaran Siswa */}
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl h-fit space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Daftarkan Siswa Baru</h2>
              <form onSubmit={handleCreateStudent} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Contoh: Budi Santoso"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Username / NISP</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                    placeholder="Contoh: 12345678"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kelas</label>
                  <input 
                    type="text" 
                    value={className} 
                    onChange={(e) => setClassName(e.target.value)} 
                    required 
                    placeholder="Contoh: XII IPA 1"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder="••••••••"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl text-xs font-bold transition shadow-lg mt-2"
                >
                  Tambah Siswa
                </button>
              </form>
            </div>

            {/* Tabel Daftar Siswa */}
            <div className="lg:col-span-2 bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
                Daftar Siswa Terdaftar ({students.length})
              </h2>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">Memuat data siswa...</div>
              ) : students.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">Belum ada akun siswa terdaftar.</div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 uppercase text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Nama Siswa</th>
                        <th className="p-3.5">Username / NISP</th>
                        <th className="p-3.5">Kelas</th>
                        <th className="p-3.5">Terdaftar</th>
                        <th className="p-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {students.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-3.5 font-bold text-white">{s.name}</td>
                          <td className="p-3.5 font-mono text-slate-300">{s.username}</td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-bold">
                              {s.className || 'Umum / Tanpa Kelas'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400">{new Date(s.createdAt).toLocaleDateString('id-ID')}</td>
                          <td className="p-3.5 text-right">
                            <button 
                              onClick={() => handleDeleteStudent(s.id, s.name)} 
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-xs font-bold transition border border-red-500/20"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </SpaceBackground>
  );
}