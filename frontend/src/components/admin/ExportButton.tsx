'use client';

import React, { useState } from 'react';
import axios from 'axios';

export default function ExportButton({ examId }: { examId: string }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/admin/exams/${examId}/export`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${'MOCK_TEACHER_TOKEN'}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rekap_nilai_${examId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Gagal mengunduh laporan nilai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={loading} className="bg-cbt-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition shadow-md">
      {loading ? 'Mengunduh...' : '📥 Ekspor Nilai ke Excel (CSV)'}
    </button>
  );
}