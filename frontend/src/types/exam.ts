export interface QuestionOption {
  key: string;   
  text: string;  
}

export interface Question {
  id: string;
  question_text: string;
  options: QuestionOption[]; 
  points: number;
}