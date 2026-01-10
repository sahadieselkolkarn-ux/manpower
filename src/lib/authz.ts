'use client';

import { UserProfile, RoleCode } from '@/types/user';

/**
 * Checks if a user has any of the specified roles or is an admin.
 * @param userProfile The user's profile object.
 * @param codes A list of role codes to check for.
 * @returns `true` if the user has any of the roles or is an admin, otherwise `false`.
 */
export function hasAnyRole(userProfile: UserProfile | null, ...codes: RoleCode[]): boolean {
  if (!userProfile) {
    return false;
  }
  // Admin has all permissions.
  if (userProfile.isAdmin) {
    return true;
  }
  const userRoleCodes = new Set(userProfile.roleCodes || []);
  if (userRoleCodes.has('ADMIN')) {
      return true;
  }
  // Check if the user has at least one of the required roles.
  return codes.some(code => userRoleCodes.has(code));
}

export function canManageOperation(user: UserProfile | null): boolean {
    return hasAnyRole(user, "OPERATION_MANAGER", "OPERATION_OFFICER");
}

export function canManageHR(user: UserProfile | null): boolean {
    return hasAnyRole(user, "HR_MANAGER", "HR_OFFICER");
}

export function canManageFinance(user: UserProfile | null): boolean {
    return hasAnyRole(user, "FINANCE_MANAGER", "FINANCE_OFFICER", "PAYROLL_OFFICER");
}
