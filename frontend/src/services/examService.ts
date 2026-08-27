import axios from 'axios';
import { Question } from '@/types/exam';
import { API_URL } from '@/utils/api';

export async function fetchExamQuestions(examId: string, token: string): Promise<Question[]> {
  const response = await axios.get(`${API_URL}/api/exams/${examId}/questions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function saveStudentAnswer(resultId: string, questionId: string, answer: string, token: string) {
  await axios.post(`${API_URL}/api/exam/answer/${resultId}`, { questionId, answer }, {
    headers: { Authorization: `Bearer ${token}` },
  });
}