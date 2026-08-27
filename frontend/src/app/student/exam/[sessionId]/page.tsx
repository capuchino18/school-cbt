'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import SpaceBackground from '@/components/SpaceBackground';
import { API_URL } from '@/utils/api';

interface QuestionOption {
  key: string;
  text: string;
}

interface Question {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  text: string;
  options?: QuestionOption[] | string;
}

interface ExamSession {
  id: string;
  title: string;
  duration: number;
  endTime?: number;            
  publishedAt?: string;        
  subject: {
    name: string;
    questions: Question[];
  };
}

// ---------------------------------------------------------
// CUSTOM HOOK: ABSOLUTE EXAM TIMER (Aman dari Timezone Offset)
// ---------------------------------------------------------
const useExamTimer = (endTime: number | null | undefined, onTimeUp: () => void) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (!endTime) return;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const diff = endTime - now;
      return diff > 0 ? diff : 0;
    };

    const initial = calculateTimeLeft();
    setTimeLeftMs(initial);

    if (initial <= 0) {
      setIsExpired(true);
      onTimeUpRef.current();
      return;
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        setIsExpired(true);
        onTimeUpRef.current();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return { timeLeftMs, formattedTime: formatTime(timeLeftMs), isExpired };
};

// ---------------------------------------------------------
// KOMPONEN UTAMA RUANG UJIAN SISWA
// ---------------------------------------------------------
export default function StudentExamRoom() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isViolationTriggered, setIsViolationTriggered] = useState<boolean>(false);
  const [violationReason, setViolationReason] = useState<string>('');
  const [hasStartedExam, setHasStartedExam] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAlarmSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio Context Error:', e);
    }
  };

  const getAuthHeader = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  // --- SUBMIT UJIAN (MANUAL & AUTO-SUBMIT) ---
  const handleSubmitExam = useCallback(async (isAutoSubmit = false) => {
    if (submitting) return; 

    if (!isAutoSubmit && !confirm('Apakah Anda yakin ingin mengumpulkan jawaban ujian ini?')) return;
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/student/exam-sessions/${sessionId}/submit`, {
        answers,
        isAutoSubmit
      }, getAuthHeader());

      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }

      alert(isAutoSubmit ? 'Waktu ujian telah habis! Jawaban Anda dikirim secara otomatis.' : 'Ujian berhasil diselesaikan!');
      router.push('/student/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengirim jawaban ujian.');
      setSubmitting(false);
    }
  }, [answers, sessionId, getAuthHeader, router, submitting]);

  // --- FETCH DATA EXAM & ABSOLUTE TIMER CALCULATION ---
  useEffect(() => {
    if (!sessionId) return;

    const fetchExamData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/student/exam-sessions/${sessionId}`, getAuthHeader());
        
        const fetchedData: ExamSession = res.data;
        
        // Kalkulasi Waktu Mutlak yang Aman dari Timezone Offset
        let publishTimeMs = Date.now();
        if (fetchedData.publishedAt) {
          publishTimeMs = new Date(fetchedData.publishedAt).getTime();
        }

        const durationMs = fetchedData.duration * 60000;
        fetchedData.endTime = publishTimeMs + durationMs;

        // Validasi toleransi waktu berakhir
        if (Date.now() >= (fetchedData.endTime + 5000)) {
          setErrorMessage('Sesi ujian ini telah selesai atau melewati batas waktu.');
          setLoading(false);
          return;
        }

        setSession(fetchedData);
      } catch (err: any) {
        setErrorMessage(err.response?.data?.message || 'Gagal memuat sesi ujian.');
      } finally {
        setLoading(false);
      }
    };

    fetchExamData();

    const socket = io(API_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('JOIN_EXAM_ROOM', { sessionId, studentId: localStorage.getItem('userId') });
    });

    socket.on('TEACHER_RESET_VIOLATION', () => {
      setIsViolationTriggered(false);
      setViolationReason('');
      document.documentElement.requestFullscreen().catch(() => {});
      alert('Pengawas telah membuka kunci ujian Anda. Silakan lanjutkan.');
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, getAuthHeader]);

  // --- INTEGRASI TIMER ABSOLUT ---
  const { formattedTime, isExpired } = useExamTimer(session?.endTime, () => {
    if (session) handleSubmitExam(true); 
  });

  // Strict Lockdown Enforcement & Auto-Reentry Fullscreen
  useEffect(() => {
    if (!hasStartedExam || isExpired || submitting) return;

    const handleViolation = (reason: string) => {
      if (isViolationTriggered) return;
      setIsViolationTriggered(true);
      setViolationReason(reason);
      playAlarmSound();

      axios.post(`${API_URL}/api/student/exam-sessions/${sessionId}/violation`, {
        reason
      }, getAuthHeader()).catch(err => console.error('Gagal melapor pelanggaran:', err));

      if (socketRef.current) {
        socketRef.current.emit('STUDENT_VIOLATION_TRIGGERED', {
          sessionId,
          studentId: localStorage.getItem('userId'),
          reason
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        e.key === 'F12' ||
        e.key === 'F11' ||
        (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'c' || e.key === 'v' || e.key === 'i' || e.key === 'u')) ||
        (e.metaKey && e.shiftKey) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        handleViolation('Percobaan menggunakan Screenshot / Shortcut / Developer Tools terdeteksi!');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Pindah tab browser atau meminimumkan jendela ujian terdeteksi!');
      }
    };

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        handleViolation('Keluar dari mode layar penuh (Full Screen) dilarang!');
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        }, 100);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [sessionId, hasStartedExam, isViolationTriggered, isExpired, submitting, getAuthHeader]);

  const startExamAndLock = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setHasStartedExam(true);
    } catch (err: any) {
      alert('Mode Fullscreen wajib diaktifkan untuk memulai ujian! Izinkan browser menampilkan layar penuh.');
    }
  };

  const handleAnswerChange = (questionId: string, val: string) => {
    if (isExpired || submitting) return;
    setAnswers({ ...answers, [questionId]: val });
  };

  if (loading) {
    return (
      <SpaceBackground>
        <div className="min-h-screen text-white flex items-center justify-center relative z-10">
          <p className="text-sm font-bold animate-pulse">Menyiapkan lembar pengerjaan aman...</p>
        </div>
      </SpaceBackground>
    );
  }

  if (errorMessage) {
    return (
      <SpaceBackground>
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-6 space-y-4 relative z-10">
          <div className="p-4 bg-red-600/20 border border-red-500/40 rounded-xl text-red-300 text-xs max-w-md text-center shadow-lg">
            {errorMessage}
          </div>
          <button onClick={() => router.push('/student/dashboard')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition">
            ← Kembali ke Dashboard
          </button>
        </div>
      </SpaceBackground>
    );
  }

  if (!hasStartedExam) {
    return (
      <SpaceBackground>
        <div className="min-h-screen text-white flex flex-col items-center justify-center p-6 text-center space-y-6 select-none relative z-10">
          <div className="p-8 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl max-w-lg space-y-5 shadow-2xl">
            <div className="text-5xl">🔒</div>
            <h1 className="text-xl font-black text-white">MODE LOCKDOWN UJIAN AMAN</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sistem mewajibkan perangkat Anda masuk ke mode <b>Layar Penuh (Full Screen)</b>. Setelah ujian dimulai, Anda dilarang pindah tab, melakukan screenshot, atau keluar dari layar penuh.
            </p>
            <button
              onClick={startExamAndLock}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform hover:-translate-y-1"
            >
              Mulai Ujian & Masuk Layar Penuh →
            </button>
          </div>
        </div>
      </SpaceBackground>
    );
  }

  if (isViolationTriggered) {
    return (
      <div className="fixed inset-0 bg-red-950 text-white flex flex-col items-center justify-center p-6 z-50 text-center space-y-6 select-none">
        <div className="text-6xl animate-bounce">🚨</div>
        <h1 className="text-2xl font-black text-red-400 tracking-wider">UJIAN DI-JEDA & ALARM BERBUNYI</h1>
        <div className="p-5 bg-red-900/50 border border-red-500/60 rounded-2xl max-w-lg space-y-2 shadow-2xl">
          <p className="text-xs font-semibold text-slate-300">Alasan Pelanggaran:</p>
          <p className="text-sm font-bold text-red-200">{violationReason}</p>
        </div>
        <p className="text-xs text-slate-400 max-w-md">
          Perangkat Anda terkunci karena pelanggaran keamanan. Laporkan kepada Guru / Pengawas ruangan Anda untuk mereset alarm dan melanjutkan ujian.
        </p>
      </div>
    );
  }

  return (
    <SpaceBackground>
      <div className="min-h-screen text-slate-100 p-4 md:p-8 select-none relative z-10" onContextMenu={(e) => e.preventDefault()}>
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
          
          <header className="sticky top-4 z-50 flex justify-between items-center bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-4 sm:p-5 rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white line-clamp-1">{session?.title || 'Sesi Ujian CBT'}</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Mata Pelajaran: {session?.subject?.name}</p>
            </div>
            
            <div className="flex items-center space-x-3 bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl">
              <span className="hidden sm:inline text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sisa Waktu</span>
              <span className={`text-xl font-mono font-black ${isExpired ? 'text-red-500 animate-pulse' : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`}>
                {formattedTime}
              </span>
            </div>
          </header>

          <div className="space-y-5">
            {session?.subject?.questions?.map((q, qIdx) => {
              let parsedOptions: QuestionOption[] = [];
              if (Array.isArray(q.options)) {
                parsedOptions = q.options;
              } else if (typeof q.options === 'string') {
                try {
                  parsedOptions = JSON.parse(q.options);
                } catch (e) {
                  parsedOptions = [];
                }
              }

              return (
                <div key={q.id} className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 flex-shrink-0 bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30 rounded-xl flex items-center justify-center text-sm shadow-inner">
                      {qIdx + 1}
                    </div>
                    <p className="text-sm font-medium text-slate-200 leading-relaxed mt-1">
                      {q.text}
                    </p>
                  </div>

                  <div className="pl-12">
                    {q.type === 'MULTIPLE_CHOICE' && parsedOptions.length > 0 && (
                      <div className="grid grid-cols-1 gap-2.5 pt-1">
                        {parsedOptions.map((opt, oIdx) => {
                          const isSelected = answers[q.id] === opt.key || answers[q.id] === opt.text;
                          return (
                            <label key={oIdx} className={`flex items-start space-x-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]' : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-800/50'
                            }`}>
                              <input
                                type="radio"
                                name={`question_${q.id}`}
                                value={opt.key}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(q.id, opt.key)}
                                disabled={isExpired || submitting}
                                className="mt-0.5 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                              />
                              <span className="font-bold text-slate-500 w-5">{opt.key}.</span>
                              <span className={isSelected ? 'font-semibold' : ''}>{opt.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'ESSAY' && (
                      <textarea
                        rows={4}
                        placeholder="Ketik jawaban essay Anda di sini..."
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        disabled={isExpired || submitting}
                        className="w-full p-4 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:opacity-50 resize-y"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center pt-8">
            <button
              onClick={() => handleSubmitExam(false)}
              disabled={submitting || isExpired}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-xs font-bold rounded-2xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all transform hover:-translate-y-1"
            >
              {submitting ? 'MENGIRIM JAWABAN...' : 'SELESAI & KIRIM JAWABAN →'}
            </button>
            <p className="text-[11px] text-slate-500 mt-4 text-center max-w-sm">
              Pastikan semua soal telah terjawab. Ujian yang telah dikirim tidak dapat diubah kembali. Ujian akan otomatis terkirim jika waktu habis.
            </p>
          </div>

        </div>
      </div>
    </SpaceBackground>
  );
}