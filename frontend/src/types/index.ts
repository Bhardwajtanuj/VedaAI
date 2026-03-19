export interface Question {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  type: string;
}

export interface Section {
  title: string;
  instruction: string;
  questions: Question[];
  totalMarks: number;
}

export interface AssessmentResult {
  sections: Section[];
  metadata: {
    totalMarks: number;
    totalQuestions: number;
    generatedAt: string;
  };
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  dueDate: string;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  difficulty: string;
  additionalInstructions: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  jobId?: string;
  result?: AssessmentResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormValues {
  title: string;
  subject: string;
  dueDate: string;
  questionTypes: string[];
  totalQuestions: number | '';
  totalMarks: number | '';
  difficulty: string;
  additionalInstructions: string;
  file?: File | null;
}

export interface WsMessage {
  type: 'connected' | 'status' | 'progress' | 'completed' | 'failed';
  status?: string;
  progress?: number;
  message?: string;
  result?: AssessmentResult;
  error?: string;
}
