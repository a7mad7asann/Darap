import { FileSummaryDto } from './file';

export interface CreateLessonDto {
  title: string;
  content?: string;
  orderIndex?: number;
}

export interface UpdateLessonDto {
  title?: string;
  content?: string;
  orderIndex?: number;
}

export interface ReorderLessonsDto {
  lessonIds: string[];
}

export interface LessonSummaryDto {
  id: string;
  courseId: string;
  title: string;
  content: string | null;
  orderIndex: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  files: FileSummaryDto[];
  isCompleted?: boolean;
}

export type LessonDto = LessonSummaryDto;
export type StudentLessonDto = LessonSummaryDto;

export interface LessonProgressDto {
  lessonId: string;
  isCompleted: boolean;
  completedAt: string | null;
}
