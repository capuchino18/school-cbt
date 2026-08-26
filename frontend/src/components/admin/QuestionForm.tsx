'use client';

import React, { useState } from 'react';
import axios from 'axios';

export default function QuestionForm({ examId, onSuccess }: { examId: string; onSuccess: () => void }) {
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [points, setPoints] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/questions', {
        exam_id: examId,
        question_text: questionText,
        options,
        correct_answer: correctAnswer,
        points: Number(points),
      }, { headers: { Authorization: `Bearer ${'MOCK_TEACHER_TOKEN'}` } });

      setQuestionText('');
      setOptions([{ key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }]);
      onSuccess();
    } catch (error) {
      alert('Gagal menyimpan soal');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-cbt-light">
      <h3 className="text-lg font-bold text-cbt-primary mb-4">Tambah Soal Baru</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan</label>
          <textarea required rows={3} value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-cbt-primary outline-none" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Pilihan Jawaban</label>
          {options.map((opt, idx) => (
            <div key={opt.key} className="flex items-center space-x-2">
              <span className="font-bold text-cbt-primary w-6">{opt.key}.</span>
              <input required type="text" value={opt.text} onChange={(e) => {
                const newOpt = [...options];
                newOpt[idx].text = e.target.value;
                setOptions(newOpt);
              }} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-cbt-primary outline-none" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kunci Jawaban</label>
            <select value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-cbt-primary outline-none">
              {options.map((opt) => <option key={opt.key} value={opt.key}>{opt.key}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bobot Poin</label>
            <input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-cbt-primary outline-none" />
          </div>
        </div>
        <button type="submit" className="w-full bg-cbt-primary text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition shadow-md">Simpan Soal</button>
      </form>
    </div>
  );
}