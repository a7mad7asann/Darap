import { JoinCodeStatus } from './enums';

export interface CreateJoinCodeDto {
  maxUses?: number;
  expiresInDays?: number;
}

export interface JoinCodeResponseDto {
  id: string;
  courseId?: string;
  codeHint: string;
  rawCode?: string; // Only present once on creation
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  status: JoinCodeStatus;
  createdAt: string;
}

export type JoinCodeSummaryDto = JoinCodeResponseDto;

export interface JoinCodeCreatedDto extends JoinCodeResponseDto {
  rawCode: string;
}

export interface JoinCourseDto {
  code: string;
}

export interface StudentJoinedCourseDto {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  teacherName: string;
  enrolledAt: string;
}

export type JoinCourseResponseDto = StudentJoinedCourseDto;
