'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import SpaceBackground from '@/components/SpaceBackground';

// FIX: Gunakan variabel environment Vercel
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ViolationLog {
  id: string;
  reason: string;
  createdAt: string;
  student: {
    id: string;
    name: string;
    username: string;
    className?: string;
  };
}

export default function ExamMonitoringPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = use(Promise.resolve(params));
  const sessionId = resolvedParams.id;

  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [examTitle, setExamTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const showMsg = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchMonitoringData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/teacher/exam-sessions/${sessionId}/monitoring`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViolations(res.data);
    } catch (err) {
      console.error('Gagal mengambil data monitoring', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    // Ambil detail sesi ujian
    axios.get(`${API_URL}/api/teacher/exam-sessions/${sessionId}/questions`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      if (res.data?.session?.title) {
        setExamTitle(res.data.session.title);
      }
    }).catch(err => console.error(err));

    fetchMonitoringData();

    // Inisialisasi Socket.io
    const newSocket = io(API_URL, { withCredentials: true });
    setSocket(newSocket);

    newSocket.emit('JOIN_EXAM_ROOM', { sessionId });

    newSocket.on('NEW_STUDENT_VIOLATION', (violation: ViolationLog) => {
      setViolations(prev => [violation, ...prev]);
      showMsg(`Peringatan: ${violation.student?.name || 'Siswa'} melakukan pelanggaran (${violation.reason})!`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, fetchMonitoringData]);

  const handleAddTime = async (minutes: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/teacher/exam-sessions/${sessionId}/add-time`, { minutes }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMsg(`Berhasil menambah waktu ujian selama ${minutes} menit.`);
    } catch (err) {
      showMsg('Gagal menambah waktu ujian.');
    }
  };

  return (
    <SpaceBackground>
      <div className="min-h-screen text-slate-100 p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">

          <header className="flex justify-between items-center bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/exams" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl transition border border-slate-700">
                ← Kembali ke Sesi Ujian
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-white">Live Monitoring Ujian</h1>
                <p className="text-slate-400 text-xs mt-0.5">Memantau aktivitas dan pelanggaran siswa secara real-time: <span className="text-blue-400 font-semibold">{examTitle || sessionId}</span></p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button type="button" onClick={() => handleAddTime(10)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition">
                + Tambah 10 Menit
              </button>
              <button type="button" onClick={fetchMonitoringData} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700">
                Refresh Log
              </button>
            </div>
          </header>

          {message && (
            <div className="p-4 rounded-2xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {message}
            </div>
          )}

          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4">
            <h2 className="text-sm font-bold text-white">Log Aktivitas & Pelanggaran Siswa ({violations.length})</h2>
            
            <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Waktu</th>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">Kelas</th>
                    <th className="p-3.5">Jenis Pelanggaran / Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-500">Memuat data log pelanggaran...</td></tr>
                  ) : violations.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-emerald-400 font-medium">Belum ada pelanggaran terdeteksi. Semua siswa terpantau tertib.</td></tr>
                  ) : (
                    violations.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3.5 text-slate-400 font-mono">{new Date(v.createdAt).toLocaleTimeString('id-ID')}</td>
                        <td className="p-3.5 font-bold text-white">{v.student?.name || 'Siswa'} ({v.student?.username || '-'})</td>
                        <td className="p-3.5 text-purple-400">{v.student?.className || '-'}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg font-semibold">
                            ⚠️ {v.reason}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </SpaceBackground>
  );
}