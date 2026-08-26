import { useState, useCallback } from 'react';
import axios from 'axios';
import debounce from 'lodash/debounce';

export const useExam = (resultId: string) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Debounced auto-save function (menunggu 1 detik setelah user berhenti klik)
  const saveAnswer = useCallback(
    debounce(async (questionId: string, answer: string) => {
      try {
        await axios.post(`/api/exam/answer/${resultId}`, {
          questionId,
          answer,
        });
      } catch (error) {
        console.error('Gagal menyimpan jawaban:', error);
      }
    }, 1000),
    [resultId]
  );

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    saveAnswer(questionId, answer);
  };

  return { answers, handleSelectAnswer };
};