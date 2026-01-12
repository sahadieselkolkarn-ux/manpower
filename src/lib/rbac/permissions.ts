// src/lib/rbac/permissions.ts
import { UserProfile, RoleCode } from "@/types/user";

export type PermissionKey = 
  | 'ADMIN_ACCESS'
  | 'OFFICE_ACCESS'
  | 'TECH_FRONT_ACCESS'
  | 'TECH_MECH_ACCESS'
  | 'TECH_CR_ACCESS'
  | 'USERS_READ'
  | 'USERS_WRITE'
  | 'ROLES_READ'
  | 'ROLES_WRITE'
  | 'EMPLOYEES_READ'
  | 'EMPLOYEES_WRITE'
  | 'TIMESHEETS_READ'
  | 'TIMESHEETS_WRITE'
  | 'PAYROLL_READ'
  | 'PAYROLL_WRITE'
  | 'CLIENTS_READ'
  | 'CLIENTS_WRITE'
  | 'PROJECTS_READ'
  | 'PROJECTS_WRITE'
  | 'ASSIGNMENTS_READ'
  | 'ASSIGNMENTS_WRITE'
  | 'INVOICES_READ'
  | 'INVOICES_WRITE'
  | 'BILLS_READ'
  | 'BILLS_WRITE';

// This map defines which roles have which permissions.
export const PERMISSION_MAP: Record<PermissionKey, RoleCode[]> = {
    ADMIN_ACCESS: ['ADMIN'],
    USERS_READ: ['ADMIN'],
    USERS_WRITE: ['ADMIN'],
    ROLES_READ: ['ADMIN'],
    ROLES_WRITE: ['ADMIN'],

    EMPLOYEES_READ: ['HR_MANAGER', 'HR_OFFICER', 'OPERATION_MANAGER', 'MANAGEMENT_MANAGER'],
    EMPLOYEES_WRITE: ['HR_MANAGER', 'HR_OFFICER'],

    TIMESHEETS_READ: ['HR_MANAGER', 'HR_OFFICER', 'FINANCE_MANAGER', 'FINANCE_OFFICER'],
    TIMESHEETS_WRITE: ['HR_MANAGER', 'HR_OFFICER'],

    PAYROLL_READ: ['HR_MANAGER', 'FINANCE_MANAGER', 'PAYROLL_OFFICER'],
    PAYROLL_WRITE: ['FINANCE_MANAGER', 'PAYROLL_OFFICER'],

    CLIENTS_READ: ['OPERATION_MANAGER', 'OPERATION_OFFICER', 'MANAGEMENT_MANAGER', 'FINANCE_MANAGER'],
    CLIENTS_WRITE: ['OPERATION_MANAGER'],
    
    PROJECTS_READ: ['OPERATION_MANAGER', 'OPERATION_OFFICER', 'MANAGEMENT_MANAGER'],
    PROJECTS_WRITE: ['OPERATION_MANAGER'],
    
    ASSIGNMENTS_READ: ['OPERATION_MANAGER', 'OPERATION_OFFICER', 'HR_MANAGER', 'HR_OFFICER'],
    ASSIGNMENTS_WRITE: ['OPERATION_MANAGER', 'OPERATION_OFFICER'],

    INVOICES_READ: ['FINANCE_MANAGER', 'FINANCE_OFFICER'],
    INVOICES_WRITE: ['FINANCE_MANAGER'],
    
    BILLS_READ: ['FINANCE_MANAGER', 'FINANCE_OFFICER'],
    BILLS_WRITE: ['FINANCE_MANAGER'],
    
    // Legacy permissions, can be removed
    OFFICE_ACCESS: [],
    TECH_FRONT_ACCESS: [],
    TECH_MECH_ACCESS: [],
    TECH_CR_ACCESS: [],
};


export function hasPermission(user: UserProfile | null, key: PermissionKey): boolean {
  if (!user || user.status !== 'ACTIVE') {
    return false;
  }

  // Admin has all permissions.
  if (user.isAdmin) {
    return true;
  }
  
  const requiredRoles = PERMISSION_MAP[key];
  if (!requiredRoles || requiredRoles.length === 0) {
      return false; // No roles are configured for this permission key
  }
  
  // Check if the user has at least one of the required roles
  return user.roleCodes?.some(userRole => requiredRoles.includes(userRole));
}
