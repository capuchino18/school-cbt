'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import SpaceBackground from '@/components/SpaceBackground';
import { API_URL } from '@/utils/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'teachers' | 'feedbacks'>('teachers');
  const [users, setUsers] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, feedbacksRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/users`, { headers }),
        axios.get(`${API_URL}/api/admin/feedbacks`, { headers })
      ]);

      setUsers(usersRes.data || []);
      setFeedbacks(feedbacksRes.data || []);
    } catch (err: any) {
      showMsg('Gagal memuat data dashboard admin', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    if (!token || role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const handleToggleBan = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/users/${id}/ban`, { isBanned: !currentStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMsg('Status akses pengguna berhasil diperbarui.');
      fetchData();
    } catch (err: any) {
      showMsg('Gagal mengubah status ban pengguna', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const teachersList = users.filter(u => u.role === 'TEACHER');
  const filteredTeachers = teachersList.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SpaceBackground>
      <div className="min-h-screen text-slate-100 p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8 max-w-7xl mx-auto">
        
        {/* Header Dashboard Responsif */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Dashboard Admin & Monitoring</h1>
            <p className="text-xs text-slate-400 mt-1">Kontrol akses guru terdaftar serta tinjau kritik & saran publik</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-2xl transition text-center"
            >
              Lihat Landing Page
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-2xl transition">
              Keluar Sesi
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs font-semibold border ${message.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-3 bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-2 rounded-2xl">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'teachers' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Monitoring Guru ({teachersList.length})
          </button>
          <button
            onClick={() => setActiveTab('feedbacks')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'feedbacks' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Kritik & Saran ({feedbacks.length})
          </button>
        </div>

        {activeTab === 'teachers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xl">
              <div className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-bold text-slate-200 text-center sm:text-left">
                Total Guru Terdaftar: <span className="text-blue-400">{teachersList.length} Akun</span>
              </div>
              <div className="w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Cari Nama Guru / Email / Username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4">
              <h2 className="text-sm font-bold text-white">Daftar Akun Guru dalam Sistem</h2>
              
              <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/40">
                <table className="w-full text-left text-xs whitespace-nowrap md:whitespace-normal">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-4">NAMA GURU</th>
                      <th className="p-4">USERNAME</th>
                      <th className="p-4">EMAIL</th>
                      <th className="p-4">STATUS AKSES</th>
                      <th className="p-4">TANGGAL TERDAFTAR</th>
                      <th className="p-4 text-right">AKSI KONTROL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">Memuat data monitoring...</td></tr>
                    ) : filteredTeachers.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada data guru yang ditemukan.</td></tr>
                    ) : (
                      filteredTeachers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-4 font-bold text-white">{u.name}</td>
                          <td className="p-4 font-mono text-blue-300">{u.username && u.username.trim() !== '' ? u.username : '-'}</td>
                          <td className="p-4 font-mono text-slate-300">{u.email || '-'}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${u.isBanned ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>
                              {u.isBanned ? ' dibekukan' : '✓ AKTIF'}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">{u.registeredAtFormatted}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleToggleBan(u.id, u.isBanned)}
                              className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold border transition ${u.isBanned ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30' : 'bg-red-600/20 text-red-300 border-red-500/30 hover:bg-red-600/30'}`}
                            >
                              {u.isBanned ? 'Aktifkan Akun' : '🚫 Ban Guru'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedbacks' && (
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-6">
            <div>
              <h2 className="text-sm font-bold text-white">Daftar Kritik & Saran dari Pengunjung</h2>
              <p className="text-xs text-slate-400 mt-1">Pesan yang dikirimkan melalui form publik pada landing page.</p>
            </div>

            <div className="space-y-4">
              {loading ? (
                <p className="text-center text-xs text-slate-500 py-8">Memuat pesan kritik & saran...</p>
              ) : feedbacks.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-12 border border-dashed border-slate-800 rounded-2xl">
                  Belum ada kritik dan saran yang masuk.
                </div>
              ) : (
                feedbacks.map((f) => (
                  <div key={f.id} className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{f.name} <span className="text-slate-500 font-normal">({f.email})</span></span>
                      <span className="text-slate-500">{new Date(f.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
                      "{f.message}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </SpaceBackground>
  );
}