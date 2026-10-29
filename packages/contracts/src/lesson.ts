import { FileSummaryDto } from './file';

export interface CreateLessonDto {
  title: string;
  content?: string;
  orderIndex?: number;
  sectionId?: string | null;
}

export interface UpdateLessonDto {
  title?: string;
  content?: string;
  orderIndex?: number;
  sectionId?: string | null;
}

export interface ReorderLessonsDto {
  lessonIds: string[];
  sectionId?: string | null;
}

export interface LessonSummaryDto {
  id: string;
  courseId: string;
  sectionId?: string | null;
  sectionTitle?: string | null;
  title: string;
  content: string | null;
  orderIndex: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  files: FileSummaryDto[];
  isCompleted?: boolean;
  completedAt?: string | null;
}

export type LessonDto = LessonSummaryDto;
export type StudentLessonDto = LessonSummaryDto;

export interface LessonProgressDto {
  lessonId: string;
  isCompleted: boolean;
  completedAt: string | null;
}
