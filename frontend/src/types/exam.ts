export interface QuestionOption {
  key: string;   
  text: string;  
}

export interface Question {
  id: string;
  text: string; // FIX: Mengikuti schema Prisma backend terbaru (sebelumnya question_text)
  type?: 'MULTIPLE_CHOICE' | 'ESSAY';
  options?: QuestionOption[] | any; 
  points?: number;
}