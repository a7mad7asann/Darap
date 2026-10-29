import { AttemptStatus, ExamStatus, QuestionType } from './enums';

export interface CreateOptionDto {
  content: string;
  isCorrect: boolean;
  orderIndex?: number;
}

export interface QuestionOptionDto {
  id: string;
  content: string;
  isCorrect?: boolean; // Only present in teacher/admin responses or review
  orderIndex: number;
}

export interface CreateQuestionDto {
  prompt: string;
  questionType?: QuestionType;
  points?: number;
  orderIndex?: number;
  options: CreateOptionDto[];
}

export interface UpdateQuestionDto {
  prompt?: string;
  questionType?: QuestionType;
  points?: number;
  orderIndex?: number;
  options?: CreateOptionDto[];
}

export interface ExamQuestionDto {
  id: string;
  examId: string;
  prompt: string;
  questionType: QuestionType;
  points: number;
  orderIndex: number;
  options: QuestionOptionDto[];
  createdAt: string;
}

export interface CreateExamDto {
  title: string;
  instructions?: string;
  durationMinutes?: number;
  maxAttempts?: number;
  passingScore?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface UpdateExamDto {
  title?: string;
  instructions?: string;
  durationMinutes?: number;
  maxAttempts?: number;
  passingScore?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  status?: ExamStatus;
}

export interface ExamSummaryDto {
  id: string;
  courseId: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  maxAttempts: number;
  passingScore: number | null;
  status: ExamStatus;
  questionsCount: number;
  totalPoints: number;
  attemptsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamDetailDto extends ExamSummaryDto {
  questions: ExamQuestionDto[];
}

export interface StudentExamSummaryDto {
  id: string;
  courseId: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  maxAttempts: number;
  passingScore: number | null;
  status: ExamStatus;
  questionsCount: number;
  totalPoints: number;
  attemptsUsed: number;
  remainingAttempts: number;
  bestScore: number | null;
  isPassed: boolean | null;
  hasActiveAttempt: boolean;
  activeAttemptId: string | null;
}

export interface StudentExamQuestionDto {
  id: string;
  prompt: string;
  questionType: QuestionType;
  points: number;
  orderIndex: number;
  options: {
    id: string;
    content: string;
    orderIndex: number;
  }[];
}

export interface ActiveAttemptDto {
  attemptId: string;
  examId: string;
  examTitle: string;
  durationMinutes: number;
  startedAt: string;
  deadlineAt: string;
  remainingSeconds: number;
  attemptNumber: number;
  questions: StudentExamQuestionDto[];
  savedAnswers: Record<string, string>; // questionId -> selectedOptionId
}

export interface SaveAnswerDto {
  questionId: string;
  selectedOptionId: string;
}

export interface ExamAttemptSummaryDto {
  id: string;
  studentId: string;
  studentName: string;
  studentUsername: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  deadlineAt: string;
  score: number | null;
  totalPoints: number;
  isPassed: boolean | null;
  status: AttemptStatus;
}

export interface ExamResultDto {
  attemptId: string;
  examId: string;
  attemptNumber: number;
  score: number;
  totalPoints: number;
  percentage: number;
  isPassed: boolean | null;
  passingScore: number | null;
  status: AttemptStatus;
  submittedAt: string;
}

export interface AttemptQuestionReviewDto {
  questionId: string;
  prompt: string;
  points: number;
  awardedPoints: number;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  options: {
    id: string;
    content: string;
    isCorrect: boolean;
  }[];
}

export interface AttemptReviewDto {
  attemptId: string;
  examId: string;
  examTitle: string;
  attemptNumber: number;
  score: number;
  totalPoints: number;
  percentage: number;
  isPassed: boolean | null;
  passingScore: number | null;
  submittedAt: string;
  questions: AttemptQuestionReviewDto[];
}
