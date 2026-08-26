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
  subject?: { name: string };
  teacher?: { name: string };
  isSubmitted: boolean;
}

export default function StudentDashboardPage() {
  const [studentName, setStudentName] = useState<string>('');
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeLefts, setTimeLefts] = useState<{ [key: string]: string }>({});

  const fetchExamSessions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/student/exam-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExamSessions(res.data);
    } catch (err) {
      console.error('Gagal mengambil sesi ujian', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    const token = localStorage.getItem('token');

    if (!token || role !== 'STUDENT') {
      window.location.href = '/login';
      return;
    }

    if (name) setStudentName(name);
    fetchExamSessions();

    const interval = setInterval(() => {
      fetchExamSessions();
    }, 15000); // Polling berkala untuk sinkronisasi

    return () => clearInterval(interval);
  }, [fetchExamSessions]);

  // Efek Countdown Timer per Detik
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const newTimeLefts: { [key: string]: string } = {};
      let needsRefresh = false;

      examSessions.forEach((ses) => {
        const startMs = new Date(ses.startTime || Date.now()).getTime();
        const durationMin = (ses.duration || 60) + (ses.extraTime || 0);
        const endMs = ses.endTime ? new Date(ses.endTime).getTime() + ((ses.extraTime || 0) * 60000) : startMs + (durationMin * 60000);
        
        const diff = endMs - now;

        if (diff <= 0) {
          newTimeLefts[ses.id] = 'Waktu Habis (Ujian Ditutup)';
          needsRefresh = true;
        } else {
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / 1000 / 60) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          newTimeLefts[ses.id] = `${hours > 0 ? `${hours}j ` : ''}${minutes}m ${seconds}s`;
        }
      });

      setTimeLefts(newTimeLefts);

      if (needsRefresh) {
        fetchExamSessions(); // Refresh data jika ada ujian yang habis waktu
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [examSessions, fetchExamSessions]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <SpaceBackground>
      <div className="min-h-screen text-slate-100 p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <header className="flex justify-between items-center bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
            <div>
              <h1 className="text-xl font-extrabold text-white">Dashboard Ujian Siswa</h1>
              <p className="text-slate-400 text-xs mt-0.5">Selamat datang, <span className="text-blue-400 font-semibold">{studentName}</span></p>
            </div>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-2xl transition">
              Keluar
            </button>
          </header>

          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4">
            <h2 className="text-sm font-bold text-emerald-400">Daftar Ujian Aktif</h2>

            {loading ? (
              <p className="text-xs text-slate-500 text-center py-8">Memuat sesi ujian...</p>
            ) : examSessions.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400">Tidak ada sesi ujian aktif saat ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examSessions.map((ses) => {
                  const timeLeft = timeLefts[ses.id] || 'Menghitung waktu...';
                  const isTimeUp = timeLeft.includes('Waktu Habis');

                  return (
                    <div key={ses.id} className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4 flex flex-col justify-between shadow">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-bold text-white">{ses.title}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isTimeUp ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                            ⏱ {timeLeft}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Mata Pelajaran: <span className="text-slate-200 font-semibold">{ses.subject?.name || '-'}</span></p>
                        <p className="text-xs text-slate-400">Pengajar: <span className="text-slate-200">{ses.teacher?.name || '-'}</span></p>
                        <p className="text-xs text-slate-400">Durasi: <span className="text-slate-200 font-semibold">{(ses.duration || 60) + (ses.extraTime || 0)} Menit</span></p>
                      </div>

                      <div>
                        {ses.isSubmitted ? (
                          <div className="w-full py-2.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold text-center">
                            ✓ Ujian Telah Selesai Dikerjakan
                          </div>
                        ) : isTimeUp ? (
                          <div className="w-full py-2.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold text-center">
                            Waktu Ujian Telah Berakhir
                          </div>
                        ) : (
                          <Link href={`/student/exam/${ses.id}`} className="block w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold text-center shadow transition">
                            Mulai Ujian →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </SpaceBackground>
  );
}