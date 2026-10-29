import { LessonSummaryDto } from './lesson';

export interface CreateSectionDto {
  title: string;
  description?: string;
  orderIndex?: number;
}

export interface UpdateSectionDto {
  title?: string;
  description?: string;
  orderIndex?: number;
}

export interface ReorderSectionsDto {
  sectionIds: string[];
}

export interface SectionSummaryDto {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessonsCount?: number;
  lessons?: LessonSummaryDto[];
  createdAt: string;
  updatedAt?: string;
}
