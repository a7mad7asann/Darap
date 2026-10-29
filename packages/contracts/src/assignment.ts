import { AssignmentStatus, SubmissionStatus } from './enums';

export interface CreateAssignmentDto {
  title: string;
  description?: string;
  maxScore?: number;
  dueDate?: string | null;
}

export interface UpdateAssignmentDto {
  title?: string;
  description?: string;
  maxScore?: number;
  dueDate?: string | null;
  status?: AssignmentStatus;
}

export interface SubmissionAttachmentDto {
  id: string;
  fileId: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
}

export interface StudentSubmissionDto {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  studentUsername?: string;
  textContent: string | null;
  submittedAt: string;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
  graderName?: string | null;
  attachments: SubmissionAttachmentDto[];
}

export interface AssignmentSubmissionSummaryDto {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentUsername: string;
  textContent: string | null;
  submittedAt: string;
  status: SubmissionStatus;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
  graderName?: string | null;
  attachmentsCount: number;
  attachments: SubmissionAttachmentDto[];
}

export interface AssignmentSummaryDto {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  maxScore: number;
  dueDate: string | null;
  status: AssignmentStatus;
  submissionsCount?: number;
  gradedCount?: number;
  isOverdue?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentDetailDto extends AssignmentSummaryDto {
  submissions?: AssignmentSubmissionSummaryDto[];
  mySubmission?: StudentSubmissionDto | null;
}

export interface SubmitAssignmentDto {
  textContent?: string;
  fileIds?: string[];
}

export interface GradeSubmissionDto {
  score: number;
  feedback?: string;
}
