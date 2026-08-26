'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import SpaceBackground from '@/components/SpaceBackground';

interface StudentAnswer {
  questionId: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect?: boolean;
}

interface ExamResult {
  id: string;
  scorePG: number;
  scoreEssay: number;
  totalScore: number;
  submittedAt: string;
  student?: { id: string; name: string; username: string; className?: string };
  answers?: StudentAnswer[];
}

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

export default function TeacherExamResultDetailPage({ params }: { params: { id: string } }) {
  const sessionId = params.id;

  const [teacherName, setTeacherName] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [examTitle, setExamTitle] = useState<string>('');
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [viewingAnswersResult, setViewingAnswersResult] = useState<ExamResult | null>(null);
  const [activeTab, setActiveTab] = useState<'scores' | 'violations'>('scores');
  const [loading, setLoading] = useState<boolean>(true);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Ambil detail sesi ujian (judul)
      const sessionRes = await axios.get(`http://localhost:5000/api/teacher/exam-sessions/${sessionId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sessionRes.data?.session?.title) {
        setExamTitle(sessionRes.data.session.title);
      }

      // Ambil hasil nilai siswa
      const resultsRes = await axios.get(`http://localhost:5000/api/teacher/exam-results/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExamResults(resultsRes.data || []);

      // Ambil log pelanggaran monitoring
      const monitoringRes = await axios.get(`http://localhost:5000/api/teacher/exam-sessions/${sessionId}/monitoring`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViolations(monitoringRes.data || []);

    } catch (err: any) {
      console.error('Fetch result detail error:', err);
      showMsg('Gagal memuat rekapitulasi hasil ujian.', 'error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    if (name) setTeacherName(name);
    fetchData();
  }, [fetchData]);

  const handleExportExcel = () => {
    window.open(`http://localhost:5000/api/teacher/export-results/${sessionId}`, '_blank');
  };

  const handleClearExamHistory = async () => {
    if (!confirm('Hapus SELURUH RIWAYAT HASIL UJIAN dan nilai siswa pada sesi ini secara permanen?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/teacher/exam-results/clear/${sessionId}`, getAuthHeader());
      showMsg('Riwayat hasil ujian berhasil dibersihkan.');
      setExamResults([]);
    } catch (err) {
      showMsg('Gagal menghapus riwayat hasil ujian.', 'error');
    }
  };

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
                <h1 className="text-xl font-extrabold text-white">Hasil Ujian: {examTitle || 'Sesi Ujian'}</h1>
                <p className="text-slate-400 text-xs mt-0.5">Rekapitulasi nilai akhir siswa dan audit log pelanggaran ujian</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button onClick={handleExportExcel} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition">
                Export Excel (.xlsx)
              </button>
              <button onClick={handleClearExamHistory} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl transition">
                Hapus Riwayat Sesi
              </button>
            </div>
          </header>

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-semibold border ${message.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
              {message.text}
            </div>
          )}

          {/* TAB NAVIGATION */}
          <div className="flex space-x-3 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('scores')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition ${activeTab === 'scores' ? 'bg-blue-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'}`}
            >
              📊 Nilai Siswa ({examResults.length})
            </button>
            <button
              onClick={() => setActiveTab('violations')}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition ${activeTab === 'violations' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'}`}
            >
              ⚠️ Log Pelanggaran Siswa ({violations.length})
            </button>
          </div>

          {/* KONTEN TAB: NILAI SISWA */}
          {activeTab === 'scores' && (
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4">
              <h2 className="text-sm font-bold text-white">Daftar Nilai Akhir Siswa</h2>

              <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Nama Siswa</th>
                      <th className="p-3.5">Kelas</th>
                      <th className="p-3.5">Nilai PG</th>
                      <th className="p-3.5">Nilai Essay</th>
                      <th className="p-3.5">Total Skor</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">Memuat rekapitulasi nilai...</td></tr>
                    ) : examResults.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">Belum ada siswa yang menyelesaikan atau mengumpulkan ujian ini.</td></tr>
                    ) : (
                      examResults.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-3.5 font-medium text-white">{r.student?.name} ({r.student?.username})</td>
                          <td className="p-3.5 text-purple-400">{r.student?.className || '-'}</td>
                          <td className="p-3.5 text-slate-300">{r.scorePG}</td>
                          <td className="p-3.5 text-slate-300">{r.scoreEssay}</td>
                          <td className="p-3.5 font-bold text-emerald-400">{r.totalScore}</td>
                          <td className="p-3.5 text-right">
                            <button onClick={() => setViewingAnswersResult(r)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-bold transition shadow">
                              🔍 Cek Jawaban
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* KONTEN TAB: LOG PELANGGARAN */}
          {activeTab === 'violations' && (
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-4">
              <h2 className="text-sm font-bold text-white">Log Pelanggaran & Aktivitas Ujian</h2>

              <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Waktu</th>
                      <th className="p-3.5">Nama Siswa</th>
                      <th className="p-3.5">Kelas</th>
                      <th className="p-3.5">Jenis Pelanggaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {violations.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-emerald-400 font-medium">Tidak ada catatan pelanggaran pada sesi ujian ini.</td></tr>
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
          )}

          {/* MODAL CEK JAWABAN SISWA */}
          {viewingAnswersResult && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white">
                    Lembar Jawaban Siswa: {viewingAnswersResult.student?.name}
                  </h3>
                  <button onClick={() => setViewingAnswersResult(null)} className="text-slate-400 hover:text-white font-bold text-xs bg-slate-800 px-3 py-1.5 rounded-xl transition">
                    Tutup [X]
                  </button>
                </div>
                <div className="space-y-3">
                  {viewingAnswersResult.answers?.map((ans, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-1.5 shadow-sm">
                      <p className="font-semibold text-slate-300">Soal #{idx + 1}: {ans.questionText}</p>
                      <p className="text-blue-400 font-medium">
                        Jawaban Siswa: <span className="text-white font-normal">{ans.studentAnswer || '(Tidak Dijawab)'}</span>
                      </p>
                      <p className="text-emerald-400 font-medium">
                        Kunci Jawaban: <span className="text-white font-normal">{ans.correctAnswer}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </SpaceBackground>
  );
}