import axios from 'axios';
import { Question } from '@/types/exam';

export async function fetchExamQuestions(examId: string, token: string): Promise<Question[]> {
  const response = await axios.get(`http://localhost:5000/api/exams/${examId}/questions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function saveStudentAnswer(resultId: string, questionId: string, answer: string, token: string) {
  await axios.post(`http://localhost:5000/api/exam/answer/${resultId}`, { questionId, answer }, {
    headers: { Authorization: `Bearer ${token}` },
  });
}