'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ExamTimerProps {
  resultId: string;
  onTimeOut: () => void;
}

export default function ExamTimer({ resultId, onTimeOut }: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isWarning, setIsWarning] = useState<boolean>(false);

  // Fungsi untuk mengambil status terbaru dari server (sinkronisasi waktu & tambahan waktu guru)
  const syncExamStatus = async () => {
    try {
      const response = await axios.get(`/api/exam/status/${resultId}`);
      const { actual_end_time, is_submitted } = response.data;

      if (is_submitted) {
        onTimeOut();
        return;
      }

      const endTime = new Date(actual_end_time).getTime();
      const now = new Date().getTime();
      const remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000));

      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 300) {
        setIsWarning(true); // Peringatan jika sisa waktu <= 5 menit
      }
    } catch (error) {
      console.error('Gagal menyinkronkan waktu ujian:', error);
    }
  };

  useEffect(() => {
    // Sinkronisasi awal saat komponen dimuat
    syncExamStatus();

    // Polling setiap 30 detik ke server untuk mendeteksi perubahan waktu (jika guru menambah waktu)
    const syncInterval = setInterval(syncExamStatus, 30000);

    // Hitung mundur setiap 1 detik di sisi klien
    const countdownInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownInterval);
          onTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(countdownInterval);
    };
  }, [resultId]);

  // Format detik ke HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (timeLeft === null) {
    return <div className="text-gray-500">Memuat waktu ujian...</div>;
  }

  return (
    <div
      className={`px-4 py-2 rounded-lg font-mono text-lg font-bold shadow-md ${
        isWarning ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-800'
      }`}
    >
      Sisa Waktu: {formatTime(timeLeft)}
    </div>
  );
}