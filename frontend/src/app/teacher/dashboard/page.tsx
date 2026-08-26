'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import SpaceBackground from '@/components/SpaceBackground';

interface ExamSession {
  id: string;
  title: string;
  duration: number;
  extraTime?: number;
  endTime?: string;
  startTime?: string;
  publishedAt?: string;
  questionMode: 'PG_ONLY' | 'ESSAY_ONLY' | 'HYBRID';
  status: 'DRAFT' | 'PUBLISHED';
  scheduledPublishAt?: string;
  targetClasses?: string[];
  subject?: {
    name: string;
  };
}

export default function TeacherDashboard() {
  const [teacherName, setTeacherName] = useState<string>('');
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [timeLefts, setTimeLefts] = useState<{ [key: string]: { text: string; isEnded: boolean } }>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const calculateTimeLefts = (sessions: ExamSession[]) => {
    const now = Date.now();
    const newTimeLefts: { [key: string]: { text: string; isEnded: boolean } } = {};

    sessions.forEach((ses) => {
      const startMs = new Date(ses.startTime || ses.publishedAt || ses.scheduledPublishAt || Date.now()).getTime();
      const durationMin = (ses.duration || 60) + (ses.extraTime || 0);
      const endMs = ses.endTime ? new Date(ses.endTime).getTime() + ((ses.extraTime || 0) * 60000) : startMs + (durationMin * 60000);
      const diff = endMs - now;

      if (diff <= 0) {
        newTimeLefts[ses.id] = { text: 'Waktu Selesai (Berakhir)', isEnded: true };
      } else {
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        newTimeLefts[ses.id] = {
          text: `${hours > 0 ? `${hours}j ` : ''}${minutes}m ${seconds}s`,
          isEnded: false
        };
      }
    });

    return newTimeLefts;
  };

  const fetchPublishedSessions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get('http://localhost:5000/api/teacher/exam-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const sessions = res.data || [];
      const published = sessions.filter((s: ExamSession) => s.status === 'PUBLISHED');
      
      setExamSessions(published);
      setTimeLefts(calculateTimeLefts(published));
    } catch (err: any) {
      console.error('Gagal memuat sesi ujian aktif:', err);
      showMsg('Gagal memuat daftar sesi ujian aktif dari server.', 'error');
    }
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    const token = localStorage.getItem('token');

    if (!token || (role !== 'TEACHER' && role !== 'ADMIN')) {
      window.location.href = '/login';
      return;
    }

    if (name) setTeacherName(name);
    fetchPublishedSessions();
  }, [fetchPublishedSessions]);

  useEffect(() => {
    if (examSessions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLefts(calculateTimeLefts(examSessions));
    }, 1000);

    return () => clearInterval(timer);
  }, [examSessions]);

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Hapus sesi ujian aktif ini secara permanen?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/teacher/exam-sessions/${id}`, getAuthHeader());
      showMsg('Sesi ujian berhasil dihapus.');
      fetchPublishedSessions();
    } catch (err) {
      showMsg('Gagal menghapus sesi ujian', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <SpaceBackground>
      <div className="min-h-screen text-slate-100 p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header Dashboard (Tombol biru + Buat & Input Soal Ujian telah dihapus) */}
          <header className="flex justify-between items-center bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
            <div>
              <h1 className="text-xl font-extrabold text-white">Dashboard Guru & Pengawas</h1>
              <p className="text-slate-400 text-xs mt-0.5">Selamat datang, <span className="text-blue-400 font-semibold">{teacherName || 'Pengajar'}</span></p>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleLogout} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-2xl transition">
                Logout
              </button>
            </div>
          </header>

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-semibold border ${message.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
              {message.text}
            </div>
          )}

          {/* DAFTAR SESI UJIAN AKTIF / BERLANGSUNG */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-bold text-white">Daftar Sesi Ujian Aktif & Riwayat ({examSessions.length})</h2>
                <p className="text-xs text-slate-400">Pantau waktu ujian, akses live monitoring, dan lihat hasil nilai siswa</p>
              </div>
              {/* Tombol abu-abu Refresh Data telah dihapus sesuai permintaan */}
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Judul Ujian</th>
                    <th className="p-3.5">Mata Pelajaran</th>
                    <th className="p-3.5">Durasi</th>
                    <th className="p-3.5">Target Kelas</th>
                    <th className="p-3.5">Sisa Waktu (Timer)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {examSessions.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-500">Belum ada sesi ujian aktif.</td></tr>
                  ) : (
                    examSessions.map((s) => {
                      const timerData = timeLefts[s.id] || { text: 'Memuat...', isEnded: false };
                      const isEnded = timerData.isEnded;

                      return (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-3.5 font-medium text-white">{s.title}</td>
                          <td className="p-3.5 text-slate-300">{s.subject?.name || '-'}</td>
                          <td className="p-3.5 text-slate-400">{(s.duration || 60) + (s.extraTime || 0)} Menit</td>
                          <td className="p-3.5">
                            {s.targetClasses && s.targetClasses.length > 0 ? (
                              <span className="text-purple-400 font-semibold">{s.targetClasses.join(', ')}</span>
                            ) : (
                              <span className="text-slate-500">Semua Kelas</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono font-bold">
                            <span className={`px-2 py-1 rounded-lg border ${isEnded ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                              ⏱ {timerData.text}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {isEnded ? (
                              <span className="px-2.5 py-0.5 bg-red-500/25 text-red-300 rounded-full text-[10px] font-bold border border-red-500/30">Selesai</span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-500/25 text-emerald-300 rounded-full text-[10px] font-bold border border-emerald-500/30">Aktif</span>
                            )}
                            {s.scheduledPublishAt && (
                              <div className="text-[10px] text-blue-300 mt-1">
                                Terbit: {new Date(s.scheduledPublishAt).toLocaleString('id-ID')}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center space-x-2">
                              <Link href={`/teacher/exams`} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold">
                                Cek Soal
                              </Link>

                              {!isEnded && (
                                <Link href={`/teacher/monitoring/${s.id}`} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-semibold transition shadow">
                                  Monitoring
                                </Link>
                              )}

                              <Link href={`/teacher/results/${s.id}`} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-semibold transition shadow">
                                Hasil Ujian
                              </Link>

                              <button type="button" onClick={() => handleDeleteSession(s.id)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl text-[11px] font-semibold border border-red-500/30">
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white">Manajemen Soal & Draf</h3>
              <p className="text-xs text-slate-400">Buat soal pilihan ganda, essay, atau hybrid, tentukan bobot penilaian, dan simpan sebagai draf atau terbitkan.</p>
              <Link href="/teacher/exams" className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700">
                Buka Menu Input Soal →
              </Link>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white">Manajemen Akun Siswa</h3>
              <p className="text-xs text-slate-400">Tambah akun siswa baru, atur pembagian kelas (misal: XII IPA 1, XII AV), dan kelola status akses siswa.</p>
              <Link href="/teacher/students" className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700">
                Kelola Daftar Siswa →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </SpaceBackground>
  );
}