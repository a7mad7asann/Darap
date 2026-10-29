import { UserRole } from './enums';

export interface CreateTeacherDto {
  username: string;
  password: string;
  displayName: string;
  email?: string;
  schoolName: string;
  slug: string;
  specialization?: string;
}

export interface CreateStudentDto {
  username: string;
  password: string;
  displayName: string;
  tenantId: string;
  gradeLevel?: string;
  parentPhone?: string;
}

export interface UserListItemDto {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  tenantName?: string;
  tenantSlug?: string;
}

export type AdminUserItemDto = UserListItemDto;

export interface AdminUsersListDto {
  items: UserListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateUserStatusDto {
  isActive: boolean;
}

export interface AdminResetPasswordDto {
  newPassword: string;
  reason?: string;
}
