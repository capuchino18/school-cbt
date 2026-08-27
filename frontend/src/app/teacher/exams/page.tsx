'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import SpaceBackground from '@/components/SpaceBackground';
import { API_URL } from '@/utils/api';

interface QuestionOption {
  key: string;
  text: string;
}

interface Question {
  id?: string;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  text: string;
  options?: QuestionOption[];
  correctAnswer?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ExamSession {
  id: string;
  title: string;
  duration: number;
  questionMode: 'PG_ONLY' | 'ESSAY_ONLY' | 'HYBRID';
  status: 'DRAFT' | 'PUBLISHED';
  weightPG: number;
  weightEssay: number;
  scheduledPublishAt?: string;
  targetClasses?: string[];
  subject?: Subject;
}

export default function TeacherExamsPage() {
  const [teacherName, setTeacherName] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [isReadOnlyMode, setIsReadOnlyMode] = useState<boolean>(false);
  const [activeEditingSessionId, setActiveEditingSessionId] = useState<string | null>(null);
  
  const [examTitle, setExamTitle] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [questionMode, setQuestionMode] = useState<'PG_ONLY' | 'ESSAY_ONLY' | 'HYBRID'>('HYBRID');
  const [examDuration, setExamDuration] = useState(60);
  const [weightPG, setWeightPG] = useState(70);
  const [weightEssay, setWeightEssay] = useState(30);
  
  const [availableClasses, setAvailableClasses] = useState<string[]>(['XII IPA 1', 'XII IPA 2', 'XII IPS 1', 'XII IPS 2']);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [inputNumPG, setInputNumPG] = useState<number>(0);
  const [inputNumEssay, setInputNumEssay] = useState<number>(0);
  const [isQuestionsGenerated, setIsQuestionsGenerated] = useState<boolean>(false);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);

  const [schedulingSessionId, setSchedulingSessionId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');

  const fetchExamSessionsAndStudents = useCallback(async () => {
    try {
      const [sessionsRes, studentsRes] = await Promise.all([
        axios.get(`${API_URL}/api/teacher/exam-sessions`, getAuthHeader()),
        axios.get(`${API_URL}/api/teacher/students`, getAuthHeader())
      ]);

      setExamSessions(sessionsRes.data);

      const classesSet = new Set<string>();
      studentsRes.data.forEach((s: any) => {
        if (s.className) classesSet.add(s.className.trim());
      });
      if (classesSet.size > 0) {
        setAvailableClasses(Array.from(classesSet));
      }
    } catch (err: any) {
      console.error('Fetch sessions/students error:', err);
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
    fetchExamSessionsAndStudents();
  }, [fetchExamSessionsAndStudents]);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleClassToggle = (cls: string) => {
    if (selectedClasses.includes(cls)) {
      setSelectedClasses(selectedClasses.filter(c => c !== cls));
    } else {
      setSelectedClasses([...selectedClasses, cls]);
    }
  };

  const handleWeightPGChange = (val: number) => {
    const clampedVal = Math.min(100, Math.max(0, val));
    setWeightPG(clampedVal);
    setWeightEssay(100 - clampedVal);
  };

  const handleWeightEssayChange = (val: number) => {
    const clampedVal = Math.min(100, Math.max(0, val));
    setWeightEssay(clampedVal);
    setWeightPG(100 - clampedVal);
  };

  const resetAllForms = () => {
    setIsReadOnlyMode(false);
    setActiveEditingSessionId(null);
    setExamTitle('');
    setSubjectName('');
    setQuestions([]);
    setQuestionMode('HYBRID');
    setExamDuration(60);
    setWeightPG(70);
    setWeightEssay(30);
    setInputNumPG(0);
    setInputNumEssay(0);
    setSelectedClasses([]);
    setIsQuestionsGenerated(false);
  };

  const handleEditExamQuestions = async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/teacher/exam-sessions/${sessionId}/questions`, getAuthHeader());
      const { session, questions: fetchedQuestions } = res.data;

      setIsReadOnlyMode(false);
      setActiveEditingSessionId(session.id);
      setExamTitle(session.title || '');
      setSubjectName(session.subject?.name || '');
      setQuestionMode(session.questionMode || 'HYBRID');
      setExamDuration(session.duration || 60);
      setWeightPG(session.weightPG ?? 70);
      setWeightEssay(session.weightEssay ?? 30);
      setSelectedClasses(session.targetClasses || []);
      setQuestions(fetchedQuestions || []);
      
      setIsQuestionsGenerated(true);
      showMsg(`Memuat ${fetchedQuestions.length} soal draf.`);
    } catch (err: any) {
      showMsg('Gagal memuat detail soal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = () => {
    if (!subjectName.trim()) {
      return showMsg('Mata Pelajaran wajib diisi terlebih dahulu!', 'error');
    }

    if (inputNumPG <= 0 && inputNumEssay <= 0) {
      return showMsg('Harap masukkan jumlah soal PG atau Essay lebih dari 0.', 'error');
    }

    let newQuestions: Question[] = [];
    
    if (questionMode === 'PG_ONLY' || questionMode === 'HYBRID') {
      for (let i = 0; i < inputNumPG; i++) {
        newQuestions.push({
          type: 'MULTIPLE_CHOICE',
          text: '',
          options: [
            { key: 'A', text: '' }, { key: 'B', text: '' },
            { key: 'C', text: '' }, { key: 'D', text: '' }
          ],
          correctAnswer: ''
        });
      }
    }
    
    if (questionMode === 'ESSAY_ONLY' || questionMode === 'HYBRID') {
      for (let i = 0; i < inputNumEssay; i++) {
        newQuestions.push({ type: 'ESSAY', text: '', correctAnswer: '' });
      }
    }
    
    setQuestions(newQuestions);
    setIsReadOnlyMode(false);
    setActiveEditingSessionId(null);
    setIsQuestionsGenerated(true);
    showMsg(`Berhasil menyiapkan form untuk ${newQuestions.length} soal.`);
  };

  const handleSaveQuestionsBatchOnly = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (questions.length === 0) return showMsg('Isi pertanyaan pada form terlebih dahulu.', 'error');

    setLoading(true);
    try {
      const activeSubjectName = subjectName.trim() || 'Mata Pelajaran Umum';
      const cleanTitle = examTitle.trim() || activeSubjectName;

      await axios.post(`${API_URL}/api/teacher/questions/batch`, {
        subjectName: activeSubjectName,
        questions
      }, getAuthHeader());

      if (activeEditingSessionId) {
        await axios.delete(`${API_URL}/api/teacher/exam-sessions/${activeEditingSessionId}`, getAuthHeader());
      }

      await axios.post(`${API_URL}/api/teacher/exam-sessions`, {
        title: cleanTitle,
        subjectName: activeSubjectName,
        duration: examDuration,
        questionMode,
        weightPG,
        weightEssay,
        targetClasses: selectedClasses,
        status: 'DRAFT'
      }, getAuthHeader());
      
      showMsg('Draft Ujian berhasil disimpan!');
      resetAllForms();
      fetchExamSessionsAndStudents();
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Gagal menyimpan draft soal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishExamSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (questions.length === 0) return showMsg('Isi pertanyaannya terlebih dahulu.', 'error');

    setLoading(true);
    try {
      const activeSubjectName = subjectName.trim() || 'Mata Pelajaran Umum';
      const activeTitle = examTitle.trim() || activeSubjectName;

      await axios.post(`${API_URL}/api/teacher/questions/batch`, {
        subjectName: activeSubjectName,
        questions
      }, getAuthHeader());

      if (activeEditingSessionId) {
        await axios.delete(`${API_URL}/api/teacher/exam-sessions/${activeEditingSessionId}`, getAuthHeader());
      }

      await axios.post(`${API_URL}/api/teacher/exam-sessions`, {
        title: activeTitle,
        subjectName: activeSubjectName,
        duration: examDuration,
        questionMode,
        weightPG: questionMode === 'PG_ONLY' ? 100 : questionMode === 'ESSAY_ONLY' ? 0 : weightPG,
        weightEssay: questionMode === 'ESSAY_ONLY' ? 100 : questionMode === 'PG_ONLY' ? 0 : weightEssay,
        targetClasses: selectedClasses,
        status: 'PUBLISHED'
      }, getAuthHeader());

      showMsg('Ujian berhasil diterbitkan ke Dashboard Utama!');
      resetAllForms();
      fetchExamSessionsAndStudents();
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Gagal menerbitkan sesi ujian', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async (sessionId: string) => {
    if (!scheduledDate || !scheduledTime) return showMsg('Harap tentukan Tanggal dan Jam terbit.', 'error');
    const fullISOString = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    try {
      await axios.put(`${API_URL}/api/teacher/exam-sessions/${sessionId}/schedule`, {
        scheduledPublishAt: fullISOString
      }, getAuthHeader());

      showMsg('Jadwal terbit berhasil dipasang!');
      setSchedulingSessionId(null);
      setScheduledDate('');
      setScheduledTime('');
      fetchExamSessionsAndStudents();
    } catch (err: any) {
      showMsg('Gagal menyimpan jadwal terbit', 'error');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Hapus draf ujian ini?')) return;
    try {
      await axios.delete(`${API_URL}/api/teacher/exam-sessions/${id}`, getAuthHeader());
      showMsg('Draf ujian dihapus.');
      fetchExamSessionsAndStudents();
    } catch (err) {
      showMsg('Gagal menghapus draf', 'error');
    }
  };

  // Hanya ambil Draf di halaman ini
  const draftSessions = examSessions.filter(s => s.status === 'DRAFT');

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
                <h1 className="text-xl font-extrabold text-white">Menu Input & Pembuatan Soal Ujian</h1>
                <p className="text-slate-400 text-xs mt-0.5">Buat bank soal, tentukan target kelas, dan kelola arsip draf</p>
              </div>
            </div>
            {teacherName && (
              <span className="text-xs font-semibold px-3.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                {teacherName}
              </span>
            )}
          </header>

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-semibold border ${message.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
              {message.text}
            </div>
          )}

          {/* Form Pembuatan Soal */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-6">
            <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-md">
              <form onSubmit={handlePublishExamSession} className="space-y-5">
                {!isQuestionsGenerated ? (
                  <div className="space-y-5">
                    <h2 className="text-sm font-bold text-emerald-400 mb-2">Form Parameter Soal Baru</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Judul Ujian</label>
                        <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder="Contoh: UTS Semester Ganjil" className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Mata Pelajaran</label>
                        <input type="text" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Contoh: Matematika" className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Mode Soal</label>
                        <select value={questionMode} onChange={(e: any) => setQuestionMode(e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white">
                          <option value="HYBRID">Hybrid (PG & Essay)</option>
                          <option value="PG_ONLY">Hanya Pilihan Ganda</option>
                          <option value="ESSAY_ONLY">Hanya Essay</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Durasi (Menit)</label>
                        <input type="number" min="1" value={examDuration} onChange={(e) => setExamDuration(parseInt(e.target.value) || 60)} className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-400">Target Kelas (Kosongkan jika untuk semua kelas / umum)</label>
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl">
                        {availableClasses.map((cls, idx) => {
                          const isSelected = selectedClasses.includes(cls);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleClassToggle(cls)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${isSelected ? 'bg-blue-600 text-white border-blue-500 shadow' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'}`}
                            >
                              {isSelected ? `✓ ${cls}` : `+ ${cls}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {questionMode === 'HYBRID' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bobot Penilaian PG (%)</label>
                          <input type="number" min="0" max="100" value={weightPG} onChange={(e) => handleWeightPGChange(parseInt(e.target.value) || 0)} className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bobot Penilaian Essay (%)</label>
                          <input type="number" min="0" max="100" value={weightEssay} onChange={(e) => handleWeightEssayChange(parseInt(e.target.value) || 0)} className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white" />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-slate-800">
                      {(questionMode === 'PG_ONLY' || questionMode === 'HYBRID') && (
                        <div className="w-32">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Jumlah Soal PG</label>
                          <input type="number" min="0" value={inputNumPG} onChange={(e) => setInputNumPG(parseInt(e.target.value) || 0)} className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white" />
                        </div>
                      )}
                      {(questionMode === 'ESSAY_ONLY' || questionMode === 'HYBRID') && (
                        <div className="w-32">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Jumlah Soal Essay</label>
                          <input type="number" min="0" value={inputNumEssay} onChange={(e) => setInputNumEssay(parseInt(e.target.value) || 0)} className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white" />
                        </div>
                      )}
                      <button type="button" onClick={handleGenerateQuestions} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition">
                        Generate Form Soal →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                      <h2 className="text-sm font-bold text-emerald-400">
                        Editor Detail Soal & Jawaban {activeEditingSessionId ? <span className="text-blue-400 font-normal">(Edit Draf)</span> : <span className="text-emerald-400 font-normal">(Draf Baru)</span>}
                      </h2>
                      <button type="button" onClick={() => resetAllForms()} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700">
                        ← Kembali ke Parameter
                      </button>
                    </div>

                    {questions.map((q, qIdx) => (
                      <div key={qIdx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-blue-400">
                            Soal #{qIdx + 1} ({q.type === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Essay'})
                          </span>
                          <button type="button" onClick={() => setQuestions(questions.filter((_, idx) => idx !== qIdx))} className="text-xs text-red-400 hover:underline font-semibold">
                            Hapus Soal
                          </button>
                        </div>

                        <textarea rows={2} placeholder="Ketik pertanyaan soal di sini..." value={q.text} onChange={(e) => {
                          const updated = [...questions];
                          updated[qIdx].text = e.target.value;
                          setQuestions(updated);
                        }} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />

                        {q.type === 'MULTIPLE_CHOICE' && q.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-slate-400 w-4">{opt.key}.</span>
                                <input type="text" placeholder={`Opsi ${opt.key}`} value={opt.text} onChange={(e) => {
                                  const updated = [...questions];
                                  if (updated[qIdx].options) updated[qIdx].options![oIdx].text = e.target.value;
                                  setQuestions(updated);
                                }} className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Kunci Jawaban (Contoh: A)</label>
                          <input type="text" value={q.correctAnswer || ''} onChange={(e) => {
                            const updated = [...questions];
                            updated[qIdx].correctAnswer = e.target.value;
                            setQuestions(updated);
                          }} className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-semibold" />
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                      <button type="button" onClick={handleSaveQuestionsBatchOnly} disabled={loading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition text-center shadow">
                        Simpan Sebagai Draf
                      </button>
                      <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition text-center shadow-lg">
                        Terbitkan ke Dashboard Utama Sekarang
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ARSIP DRAF SOAL */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <h2 className="text-sm font-bold text-amber-400">Arsip Draf Soal Ujian ({draftSessions.length})</h2>
            <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Judul Draf</th>
                    <th className="p-3.5">Mata Pelajaran</th>
                    <th className="p-3.5">Durasi</th>
                    <th className="p-3.5">Target Kelas</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi Draf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {draftSessions.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-slate-500">Tidak ada draf soal tersimpan.</td></tr>
                  ) : (
                    draftSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3.5 font-medium text-white">{s.title}</td>
                        <td className="p-3.5 text-slate-300">{s.subject?.name || '-'}</td>
                        <td className="p-3.5 text-slate-400">{s.duration || 60} Menit</td>
                        <td className="p-3.5 text-purple-400">{s.targetClasses?.length ? s.targetClasses.join(', ') : 'Semua Kelas'}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 bg-amber-500/25 text-amber-300 rounded-full text-[10px] font-bold border border-amber-500/30">Draf</span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="inline-flex items-center space-x-2">
                            <button type="button" onClick={() => handleEditExamQuestions(s.id)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-semibold">
                              Edit Draf
                            </button>

                            {schedulingSessionId === s.id ? (
                              <div className="inline-flex items-center space-x-1.5 bg-slate-900 p-1.5 rounded-xl border border-blue-500/50">
                                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="p-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-white" />
                                <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="p-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-white" />
                                <button type="button" onClick={() => handleSaveSchedule(s.id)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg">Jadwal</button>
                                <button type="button" onClick={() => setSchedulingSessionId(null)} className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] rounded-lg">X</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => {
                                setSchedulingSessionId(s.id);
                                setScheduledDate('');
                                setScheduledTime('');
                              }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-semibold">
                                Atur Terbit
                              </button>
                            )}

                            <button type="button" onClick={() => handleDeleteSession(s.id)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl text-[11px] font-semibold border border-red-500/30">
                              Hapus
                            </button>
                          </div>
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