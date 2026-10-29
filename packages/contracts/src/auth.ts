import { UserRole } from './enums';

export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface UserSummaryDto {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface TenantMembershipDto {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: UserRole;
  isOwner: boolean;
}

export interface AuthMeResponseDto {
  user: UserSummaryDto;
  activeTenant: TenantMembershipDto | null;
  memberships: TenantMembershipDto[];
}

export interface LoginResponseDto {
  user: UserSummaryDto;
  activeTenant: TenantMembershipDto | null;
  memberships: TenantMembershipDto[];
  message: string;
}
