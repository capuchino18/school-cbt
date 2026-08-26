'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import SpaceBackground from '@/components/SpaceBackground';

export default function LandingPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ teacherCount: 0, studentCount: 0, totalExamsExecuted: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Form Kritik & Saran
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/public/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Gagal mengambil statistik publik:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackLoading(true);
    setFeedbackStatus(null);
    try {
      await axios.post('http://localhost:5000/api/public/feedback', {
        name: feedbackName,
        email: feedbackEmail,
        message: feedbackMessage
      });
      setFeedbackStatus({ type: 'success', text: 'Kritik dan saran berhasil dikirim ke Admin. Terima kasih atas masukan Anda!' });
      setFeedbackName('');
      setFeedbackEmail('');
      setFeedbackMessage('');
    } catch (err: any) {
      setFeedbackStatus({ type: 'error', text: err.response?.data?.message || 'Gagal mengirim kritik dan saran.' });
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <SpaceBackground>
      <div className="min-h-screen text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white overflow-x-hidden">
        
        {/* Navbar */}
        <header className="w-full border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50 px-4 sm:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/30">
              CBT
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">Ujian Sekolah CBT</span>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition active:scale-95"
          >
            Masuk / Login
          </button>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-20 space-y-16 sm:space-y-24 w-full">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Sistem Ujian Online Terintegrasi untuk Sekolah Masa Kini
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Platform CBT canggih dengan pengawasan ujian real-time, manajemen bank soal fleksibel, penilaian otomatis pilihan ganda, serta terjamin kompatibel di segala perangkat.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                onClick={() => router.push('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-extrabold rounded-2xl shadow-xl shadow-blue-600/30 transition"
              >
                Coba Sekarang
              </button>
            </div>
          </div>

          {/* Statistik Real-Time Sistem (Hanya Angka Saja) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl text-center space-y-2 shadow-xl">
              <p className="text-xs uppercase font-bold text-slate-400">Guru Terdaftar</p>
              <p className="text-3xl sm:text-4xl font-black text-blue-400">
                {loadingStats ? '...' : stats.teacherCount}
              </p>
            </div>
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl text-center space-y-2 shadow-xl">
              <p className="text-xs uppercase font-bold text-slate-400">Murid Terdaftar</p>
              <p className="text-3xl sm:text-4xl font-black text-emerald-400">
                {loadingStats ? '...' : stats.studentCount}
              </p>
            </div>
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl text-center space-y-2 shadow-xl">
              <p className="text-xs uppercase font-bold text-slate-400">Ujian Telah Dilaksanakan</p>
              <p className="text-3xl sm:text-4xl font-black text-amber-400">
                {loadingStats ? '...' : stats.totalExamsExecuted}
              </p>
            </div>
          </div>

          {/* Keunggulan Section */}
          <div id="keunggulan" className="space-y-8 pt-10">
            <div className="text-center space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Keunggulan Platform CBT</h2>
              <p className="text-xs sm:text-sm text-slate-400">Dirancang khusus untuk memenuhi standar ujian institusi pendidikan modern.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">🛡️</div>
                <h3 className="font-bold text-white text-sm">Anti Curang & Real-Time Monitor</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Sistem pengawasan mendeteksi perpindahan tab atau layar ujian secara real-time disertai alarm peringatan otomatis.</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">⚡</div>
                <h3 className="font-bold text-white text-sm">Penilaian Otomatis & Ekspor Excel</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Nilai pilihan ganda langsung dikalkulasi instan begitu siswa mengumpulkan ujian, dan nilai dapat diekspor langsung ke file Excel.</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">📱</div>
                <h3 className="font-bold text-white text-sm">Responsif di Segala Device</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Kompatibel penuh dibuka di HP, Tablet, maupun Laptop tanpa khawatir kendala tata letak atau layar rusak.</p>
              </div>
            </div>
          </div>

          {/* Form Kritik & Saran */}
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 p-6 sm:p-10 rounded-3xl shadow-2xl max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-extrabold text-white">Kotak Kritik & Saran</h2>
              <p className="text-xs text-slate-400">Punya masukan atau pertanyaan untuk pengembangan platform ini? Kirimkan kepada kami.</p>
            </div>

            {feedbackStatus && (
              <div className={`p-4 rounded-2xl text-xs font-semibold border ${feedbackStatus.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
                {feedbackStatus.text}
              </div>
            )}

            <form onSubmit={handleSendFeedback} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  placeholder="Masukkan nama Anda"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pesan Kritik & Saran</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Tuliskan saran atau masukan Anda..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={feedbackLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-lg transition active:scale-95"
              >
                {feedbackLoading ? 'Mengirim...' : 'Kirim Kritik & Saran'}
              </button>
            </form>
          </div>

        </main>

        {/* Footer */}
        <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
          <p>© 2026 Aplikasi Ujian Sekolah CBT. All rights reserved.</p>
        </footer>

      </div>
    </SpaceBackground>
  );
}