import { CourseStatus } from './enums';
import { LessonSummaryDto } from './lesson';
import { SectionSummaryDto } from './section';

export interface CreateCourseDto {
  title: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  subject?: string;
  gradeLevel?: string;
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
  gradeLevel?: string | null;
  status: CourseStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lessonsCount?: number;
  sectionsCount?: number;
  enrolledStudentsCount?: number;
  enrolledCount?: number;
}

export interface CourseDetailsDto extends CourseSummaryDto {
  lessons: LessonSummaryDto[];
  sections?: SectionSummaryDto[];
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
  gradeLevel?: string | null;
  teacherName: string;
  enrolledAt: string;
  lessonsCount: number;
}
