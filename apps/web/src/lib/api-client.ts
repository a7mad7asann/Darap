import {
  AuthMeResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  ApiResponseEnvelope,
  ApiErrorResponseEnvelope,
  CourseSummaryDto,
  CourseDetailsDto,
  CreateCourseDto,
  UpdateCourseDto,
  LessonDto,
  CreateLessonDto,
  UpdateLessonDto,
  ReorderLessonsDto,
  SectionSummaryDto,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderSectionsDto,
  JoinCodeSummaryDto,
  CreateJoinCodeDto,
  JoinCodeCreatedDto,
  JoinCourseDto,
  JoinCourseResponseDto,
  StudentCourseSummaryDto,
  StudentLessonDto,
  PresignUploadRequestDto,
  PresignUploadResponseDto,
  CompleteUploadRequestDto,
  PresignDownloadResponseDto,
  CreateTeacherDto,
  CreateStudentDto,
  AdminResetPasswordDto,
  AdminUsersListDto,
  EnrolledStudentSummaryDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentSummaryDto,
  AssignmentDetailDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  StudentSubmissionDto,
  AssignmentSubmissionSummaryDto,
} from '@darb/contracts';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const errorEnvelope = data as ApiErrorResponseEnvelope;
    const message = Array.isArray(errorEnvelope.message)
      ? errorEnvelope.message.join(', ')
      : errorEnvelope.message || 'حدث خطأ أثناء معالجة الطلب';
    throw new Error(message);
  }
  const envelope = data as ApiResponseEnvelope<T>;
  return envelope.data;
}

export const apiClient = {
  // --- Auth & Health ---
  async login(payload: LoginRequestDto): Promise<LoginResponseDto> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<LoginResponseDto>(res);
  },

  async logout(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(res);
  },

  async getMe(): Promise<AuthMeResponseDto> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<AuthMeResponseDto>(res);
  },

  async checkLive(): Promise<{ status: string; uptime: number }> {
    const res = await fetch(`${API_BASE}/health/live`);
    return handleResponse<{ status: string; uptime: number }>(res);
  },

  async checkReady(): Promise<{ status: string; database: string }> {
    const res = await fetch(`${API_BASE}/health/ready`);
    return handleResponse<{ status: string; database: string }>(res);
  },

  // --- Teacher Courses ---
  async getTeacherCourses(): Promise<CourseSummaryDto[]> {
    const res = await fetch(`${API_BASE}/teacher/courses`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<CourseSummaryDto[]>(res);
  },

  async createCourse(payload: CreateCourseDto): Promise<CourseSummaryDto> {
    const res = await fetch(`${API_BASE}/teacher/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<CourseSummaryDto>(res);
  },

  async getTeacherCourse(courseId: string): Promise<CourseDetailsDto> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<CourseDetailsDto>(res);
  },

  async updateCourse(courseId: string, payload: UpdateCourseDto): Promise<CourseDetailsDto> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<CourseDetailsDto>(res);
  },

  async publishCourse(courseId: string): Promise<CourseDetailsDto> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/publish`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<CourseDetailsDto>(res);
  },

  async archiveCourse(courseId: string): Promise<CourseDetailsDto> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/archive`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<CourseDetailsDto>(res);
  },

  async getCourseStudents(courseId: string): Promise<EnrolledStudentSummaryDto[]> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/students`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<EnrolledStudentSummaryDto[]>(res);
  },

  // --- Teacher Sections ---
  async createSection(courseId: string, payload: CreateSectionDto): Promise<SectionSummaryDto> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<SectionSummaryDto>(res);
  },

  async getCourseSections(courseId: string): Promise<SectionSummaryDto[]> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/sections`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<SectionSummaryDto[]>(res);
  },

  async updateSection(sectionId: string, payload: UpdateSectionDto): Promise<SectionSummaryDto> {
    const res = await fetch(`${API_BASE}/teacher/sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<SectionSummaryDto>(res);
  },

  async deleteSection(sectionId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/teacher/sections/${sectionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(res);
  },

  async reorderSections(courseId: string, payload: ReorderSectionsDto): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/sections/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string }>(res);
  },

  // --- Teacher Lessons ---
  async createLesson(courseId: string, payload: CreateLessonDto): Promise<LessonDto> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<LessonDto>(res);
  },

  async updateLesson(lessonId: string, payload: UpdateLessonDto): Promise<LessonDto> {
    const res = await fetch(`${API_BASE}/teacher/lessons/${lessonId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<LessonDto>(res);
  },

  async publishLesson(lessonId: string): Promise<LessonDto> {
    const res = await fetch(`${API_BASE}/teacher/lessons/${lessonId}/publish`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<LessonDto>(res);
  },

  async archiveLesson(lessonId: string): Promise<LessonDto> {
    const res = await fetch(`${API_BASE}/teacher/lessons/${lessonId}/archive`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<LessonDto>(res);
  },

  async deleteLesson(lessonId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/teacher/lessons/${lessonId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async reorderLessons(courseId: string, payload: ReorderLessonsDto): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/lessons/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string }>(res);
  },

  // --- Teacher Join Codes ---
  async generateJoinCode(courseId: string, payload: CreateJoinCodeDto): Promise<JoinCodeCreatedDto> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/join-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<JoinCodeCreatedDto>(res);
  },

  async getCourseJoinCodes(courseId: string): Promise<JoinCodeSummaryDto[]> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/join-codes`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<JoinCodeSummaryDto[]>(res);
  },

  async revokeJoinCode(codeId: string): Promise<{ id: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/teacher/join-codes/${codeId}/revoke`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ id: string; status: string; message: string }>(res);
  },

  // --- Files & Object Storage ---
  async presignLessonUpload(
    lessonId: string,
    payload: PresignUploadRequestDto,
  ): Promise<PresignUploadResponseDto> {
    const res = await fetch(`${API_BASE}/teacher/lessons/${lessonId}/files/presign-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<PresignUploadResponseDto>(res);
  },

  async completeUpload(
    lessonId: string,
    payload: CompleteUploadRequestDto,
  ): Promise<{ id: string; originalName: string; mimeType: string; byteSize: number }> {
    const res = await fetch(`${API_BASE}/teacher/lessons/${lessonId}/files/complete-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<{ id: string; originalName: string; mimeType: string; byteSize: number }>(res);
  },

  async deleteLessonFile(lessonId: string, fileId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/teacher/lessons/${lessonId}/files/${fileId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ message: string }>(res);
  },

  async presignStudentDownload(fileId: string): Promise<PresignDownloadResponseDto> {
    const res = await fetch(`${API_BASE}/student/files/${fileId}/presign-download`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<PresignDownloadResponseDto>(res);
  },

  // --- Assignments & Grading (Teacher) ---
  async getTeacherAssignments(courseId: string): Promise<AssignmentSummaryDto[]> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/assignments`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<AssignmentSummaryDto[]>(res);
  },

  async createAssignment(courseId: string, payload: CreateAssignmentDto): Promise<AssignmentSummaryDto> {
    const res = await fetch(`${API_BASE}/teacher/courses/${courseId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<AssignmentSummaryDto>(res);
  },

  async getTeacherAssignmentDetails(assignmentId: string): Promise<AssignmentDetailDto> {
    const res = await fetch(`${API_BASE}/teacher/assignments/${assignmentId}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<AssignmentDetailDto>(res);
  },

  async updateAssignment(assignmentId: string, payload: UpdateAssignmentDto): Promise<AssignmentSummaryDto> {
    const res = await fetch(`${API_BASE}/teacher/assignments/${assignmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<AssignmentSummaryDto>(res);
  },

  async publishAssignment(assignmentId: string): Promise<{ id: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/teacher/assignments/${assignmentId}/publish`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ id: string; status: string; message: string }>(res);
  },

  async closeAssignment(assignmentId: string): Promise<{ id: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/teacher/assignments/${assignmentId}/close`, {
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse<{ id: string; status: string; message: string }>(res);
  },

  async deleteAssignment(assignmentId: string): Promise<{ id: string; message: string }> {
    const res = await fetch(`${API_BASE}/teacher/assignments/${assignmentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse<{ id: string; message: string }>(res);
  },

  async gradeSubmission(submissionId: string, payload: GradeSubmissionDto): Promise<AssignmentSubmissionSummaryDto> {
    const res = await fetch(`${API_BASE}/teacher/submissions/${submissionId}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<AssignmentSubmissionSummaryDto>(res);
  },

  async presignTeacherSubmissionDownload(fileId: string): Promise<PresignDownloadResponseDto> {
    const res = await fetch(`${API_BASE}/teacher/submission-attachments/${fileId}/presign-download`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<PresignDownloadResponseDto>(res);
  },

  // --- Assignments & Submissions (Student) ---
  async getStudentAssignments(courseId: string): Promise<AssignmentDetailDto[]> {
    const res = await fetch(`${API_BASE}/student/courses/${courseId}/assignments`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<AssignmentDetailDto[]>(res);
  },

  async getStudentAssignmentDetails(assignmentId: string): Promise<AssignmentDetailDto> {
    const res = await fetch(`${API_BASE}/student/assignments/${assignmentId}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<AssignmentDetailDto>(res);
  },

  async submitAssignment(assignmentId: string, payload: SubmitAssignmentDto): Promise<AssignmentSubmissionSummaryDto> {
    const res = await fetch(`${API_BASE}/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<AssignmentSubmissionSummaryDto>(res);
  },

  async presignSubmissionUpload(
    assignmentId: string,
    payload: PresignUploadRequestDto,
  ): Promise<PresignUploadResponseDto> {
    const res = await fetch(`${API_BASE}/student/assignments/${assignmentId}/files/presign-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<PresignUploadResponseDto>(res);
  },

  async completeSubmissionUpload(
    assignmentId: string,
    payload: CompleteUploadRequestDto,
  ): Promise<{ id: string; originalName: string; mimeType: string; byteSize: number }> {
    const res = await fetch(`${API_BASE}/student/assignments/${assignmentId}/files/complete-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<{ id: string; originalName: string; mimeType: string; byteSize: number }>(res);
  },

  async presignStudentSubmissionDownload(fileId: string): Promise<PresignDownloadResponseDto> {
    const res = await fetch(`${API_BASE}/student/submission-attachments/${fileId}/presign-download`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<PresignDownloadResponseDto>(res);
  },

  // --- Student Learning ---
  async joinCourse(payload: JoinCourseDto): Promise<JoinCourseResponseDto> {
    const res = await fetch(`${API_BASE}/student/join-courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<JoinCourseResponseDto>(res);
  },

  async getStudentCourses(): Promise<StudentCourseSummaryDto[]> {
    const res = await fetch(`${API_BASE}/student/courses`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<StudentCourseSummaryDto[]>(res);
  },

  async getStudentCourse(courseId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/student/courses/${courseId}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<any>(res);
  },

  async getStudentLessons(courseId: string): Promise<StudentLessonDto[]> {
    const res = await fetch(`${API_BASE}/student/courses/${courseId}/lessons`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<StudentLessonDto[]>(res);
  },

  async markLessonProgress(
    lessonId: string,
    isCompleted = true,
  ): Promise<{ lessonId: string; isCompleted: boolean; completedAt: string | null }> {
    const res = await fetch(`${API_BASE}/student/lessons/${lessonId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isCompleted }),
    });
    return handleResponse<{ lessonId: string; isCompleted: boolean; completedAt: string | null }>(res);
  },

  // --- Admin Provisioning ---
  async createTeacher(payload: CreateTeacherDto): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async createStudent(payload: CreateStudentDto): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async listUsers(page = 1, limit = 50): Promise<AdminUsersListDto> {
    const res = await fetch(`${API_BASE}/admin/users?page=${page}&limit=${limit}`, {
      method: 'GET',
      credentials: 'include',
    });
    return handleResponse<AdminUsersListDto>(res);
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive }),
    });
    return handleResponse<any>(res);
  },

  async resetPassword(userId: string, payload: AdminResetPasswordDto): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },
};
