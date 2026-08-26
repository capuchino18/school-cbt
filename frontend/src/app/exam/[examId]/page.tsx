'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: number;
  text: string;
  options: { key: string; text: string }[];
}

const dummyQuestions: Question[] = [
  {
    id: 1,
    text: 'Apa ibu kota dari negara Indonesia saat ini?',
    options: [
      { key: 'A', text: 'Surabaya' },
      { key: 'B', text: 'Jakarta' },
      { key: 'C', text: 'Bandung' },
      { key: 'D', text: 'Medan' },
    ],
  },
  {
    id: 2,
    text: 'Bahasa pemrograman yang digunakan untuk membangun antarmuka Next.js adalah?',
    options: [
      { key: 'A', text: 'Python' },
      { key: 'B', text: 'TypeScript / JavaScript' },
      { key: 'C', text: 'PHP' },
      { key: 'D', text: 'C++' },
    ],
  },
  {
    id: 3,
    text: 'Framework CSS yang digunakan pada tampilan aplikasi CBT ini adalah?',
    options: [
      { key: 'A', text: 'Bootstrap' },
      { key: 'B', text: 'Tailwind CSS' },
      { key: 'C', text: 'Bulma' },
      { key: 'D', text: 'Foundation' },
    ],
  },
];

export default function ExamPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [timeLeft, setTimeLeft] = useState(3600); // 60 menit dalam detik
  const router = useRouter();

  // Proteksi Halaman: Cek Token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Timer Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionKey: string) => {
    const questionId = dummyQuestions[currentIdx].id;
    setAnswers({ ...answers, [questionId]: optionKey });
  };

  const currentQ = dummyQuestions[currentIdx];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header Bar */}
      <header className="bg-[#0288D1] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-xl font-bold">Ujian Sekolah CBT</h1>
          <p className="text-xs text-blue-100">Mata Pelajaran: Simulasi Digital</p>
        </div>
        <div className="bg-white text-[#0288D1] px-4 py-2 rounded-lg font-mono font-bold text-lg shadow">
          Sisa Waktu: {formatTime(timeLeft)}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Kolom Kiri: Soal & Opsi */}
        <div className="md:col-span-3 bg-white p-6 rounded-xl shadow flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <span className="font-semibold text-gray-700">Soal No. {currentIdx + 1} dari {dummyQuestions.length}</span>
            </div>
            
            <p className="text-lg text-gray-800 mb-6 font-medium">{currentQ.text}</p>

            <div className="space-y-3">
              {currentQ.options.map((opt) => {
                const isSelected = answers[currentQ.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectOption(opt.key)}
                    className={`w-full text-left p-4 rounded-lg border transition flex items-center space-x-3 ${
                      isSelected
                        ? 'border-[#0288D1] bg-blue-50 text-[#0288D1] font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      isSelected ? 'bg-[#0288D1] text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {opt.key}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigasi Bawah */}
          <div className="flex justify-between items-center pt-6 border-t mt-8">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 font-medium hover:bg-gray-300 transition"
            >
              Sebelumnya
            </button>

            {currentIdx < dummyQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(dummyQuestions.length - 1, prev + 1))}
                className="px-5 py-2.5 bg-[#0288D1] text-white rounded-lg font-medium hover:bg-blue-600 transition shadow"
              >
                Selanjutnya
              </button>
            ) : (
              <button
                onClick={() => alert('Ujian Selesai! Jawaban tersimpan.')}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition shadow"
              >
                Selesaikan Ujian
              </button>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Grid Navigasi Soal */}
        <div className="bg-white p-6 rounded-xl shadow h-fit">
          <h2 className="font-bold text-gray-700 mb-4 border-b pb-2">Navigasi Soal</h2>
          <div className="grid grid-cols-4 gap-2">
            {dummyQuestions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`py-2 rounded-lg font-bold text-sm border transition ${
                    isCurrent
                      ? 'ring-2 ring-[#0288D1] border-[#0288D1]'
                      : ''
                  } ${
                    isAnswered
                      ? 'bg-[#0288D1] text-white border-[#0288D1]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}