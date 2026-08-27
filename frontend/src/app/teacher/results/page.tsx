'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import SpaceBackground from '@/components/SpaceBackground';
import { API_URL } from '@/utils/api';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ExamSession {
  id: string;
  title: string;
  duration: number;
  status: string;
  createdAt: string;
  subject?: Subject;
}

export default function TeacherResultsIndexPage() {
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [teacherName, setTeacherName] = useState<string>('');

  useEffect(() => {
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    const token = localStorage.getItem('token');

    if (!token || (role !== 'TEACHER' && role !== 'ADMIN')) {
      window.location.href = '/login';
      return;
    }

    if (name) setTeacherName(name);

    axios.get(`${API_URL}/api/teacher/exam-sessions`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setExamSessions(res.data || []);
    }).catch(err => {
      console.error('Gagal mengambil daftar sesi ujian:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <SpaceBackground>
      <div className="min-h-screen text-slate-100 p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="flex justify-between items-center bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/dashboard" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl transition border border-slate-700">
                ← Kembali ke Dashboard
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-white">Rekapitulasi Hasil Ujian</h1>
                <p className="text-slate-400 text-xs mt-0.5">Pilih sesi ujian di bawah untuk melihat nilai akhir dan log pelanggaran siswa</p>
              </div>
            </div>
            {teacherName && (
              <span className="text-xs font-semibold px-3.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                {teacherName}
              </span>
            )}
          </header>

          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4">
            <h2 className="text-sm font-bold text-white">Daftar Sesi Ujian Tersedia</h2>

            <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Judul Ujian</th>
                    <th className="p-3.5">Mata Pelajaran</th>
                    <th className="p-3.5">Durasi</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">Memuat daftar sesi ujian...</td></tr>
                  ) : examSessions.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">Belum ada sesi ujian yang dibuat.</td></tr>
                  ) : (
                    examSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3.5 font-medium text-white">{s.title}</td>
                        <td className="p-3.5 text-slate-300">{s.subject?.name || '-'}</td>
                        <td className="p-3.5 text-slate-400">{s.duration || 60} Menit</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${s.status === 'PUBLISHED' ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/25 text-amber-300 border-amber-500/30'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <Link href={`/teacher/results/${s.id}`} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-semibold transition shadow">
                            Lihat Hasil Nilai & Pelanggaran →
                          </Link>
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