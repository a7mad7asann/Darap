import { CourseStatus } from './enums';
import { LessonSummaryDto } from './lesson';

export interface CreateCourseDto {
  title: string;
  description?: string;
  subject?: string;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  subject?: string;
}

export interface EnrolledStudentDto {
  studentId: string;
  username: string;
  displayName: string;
  enrolledAt: string;
  enrollmentId?: string;
  joinedViaCodeHint?: string | null;
}

export type EnrolledStudentSummaryDto = EnrolledStudentDto;

export interface CourseSummaryDto {
  id: string;
  tenantId: string;
  teacherId: string;
  teacherName?: string;
  title: string;
  description: string | null;
  subject: string | null;
  status: CourseStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lessonsCount?: number;
  enrolledStudentsCount?: number;
  enrolledCount?: number;
}

export interface CourseDetailsDto extends CourseSummaryDto {
  lessons: LessonSummaryDto[];
  enrolledStudents?: EnrolledStudentDto[];
}

export interface CourseDetailDto extends CourseSummaryDto {
  enrolledStudents?: EnrolledStudentDto[];
}

export interface StudentCourseSummaryDto {
  enrollmentId: string;
  courseId: string;
  title: string;
  description: string | null;
  subject: string | null;
  teacherName: string;
  enrolledAt: string;
  lessonsCount: number;
}
