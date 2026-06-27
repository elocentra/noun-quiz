// =============================================
// NOUN Smart Quiz System - Type Definitions
// =============================================

export type QuestionType = "mcq" | "short_answer";
export type AttemptStatus = "in_progress" | "submitted" | "reset";
export type ProcessingStatus = "pending" | "processing" | "done" | "error";

export interface Course {
  id: string;
  code: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CourseMaterial {
  id: string;
  course_id: string;
  week_number: number;
  title: string;
  file_name: string;
  file_type: "pdf" | "docx" | "txt";
  raw_text: string;
  storage_path?: string;
  processing_status: ProcessingStatus;
  created_at: string;
}

export interface Question {
  id: string;
  course_id: string;
  material_id?: string;
  week_number: number;
  question_type: QuestionType;
  question_text: string;     // Sentence with ________ blank
  correct_answer: string;    // The removed word/phrase
  source_sentence: string;   // Verbatim from material
  options?: string[];        // 4 options for MCQ only
  explanation: string;       // From material only
  is_active: boolean;
  created_at: string;
}

export interface Quiz {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  week_number: number;
  mcq_count: number;
  short_answer_count: number;
  is_published: boolean;
  is_active: boolean;
  time_limit_minutes?: number;
  created_at: string;
  updated_at: string;
  // Joined
  course?: Course;
}

export interface StudentAttempt {
  id: string;
  quiz_id: string;
  student_name: string;
  device_fingerprint: string;
  status: AttemptStatus;
  total_questions?: number;
  correct_count?: number;
  score_percentage?: number;
  question_order?: string[];  // Array of question IDs in shuffled order
  started_at: string;
  submitted_at?: string;
  time_taken_seconds?: number;
  // Joined
  quiz?: Quiz;
}

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  student_answer: string;
  is_correct?: boolean;
  ai_feedback?: string;
  selected_option_index?: number;
  created_at: string;
  // Joined
  question?: Question;
}

// =============================================
// AI Pipeline Types
// =============================================

export interface GeneratedQuestion {
  question_type: QuestionType;
  question_text: string;
  correct_answer: string;
  source_sentence: string;
  options?: string[];
  explanation: string;
}

export interface AIGradingResult {
  is_correct: boolean;
  feedback: string;
}

// =============================================
// API Request/Response Types
// =============================================

export interface UploadMaterialRequest {
  course_id: string;
  week_number: number;
  title: string;
  file_name: string;
  file_type: string;
  raw_text: string;
}

export interface GenerateQuestionsRequest {
  material_id: string;
  mcq_count: number;
  short_answer_count: number;
}

export interface CreateQuizRequest {
  course_id: string;
  slug: string;
  title: string;
  week_number: number;
  mcq_count: number;
  short_answer_count: number;
  time_limit_minutes?: number;
}

export interface StartQuizRequest {
  student_name: string;
  device_fingerprint: string;
}

export interface SubmitQuizRequest {
  attempt_id: string;
  answers: {
    question_id: string;
    student_answer: string;
    selected_option_index?: number;
  }[];
}

// =============================================
// Dashboard Analytics Types
// =============================================

export interface QuizAnalytics {
  quiz: Quiz;
  total_attempts: number;
  avg_score: number;
  highest_score: number;
  lowest_score: number;
  attempts: (StudentAttempt & { answers: StudentAnswer[] })[];
}

export interface StudentPerformance {
  student_name: string;
  attempts: StudentAttempt[];
  avg_score: number;
}
