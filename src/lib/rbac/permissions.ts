// src/lib/rbac/permissions.ts
import { UserProfile } from "@/types/user";

type PermissionKey = 
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

export function hasPermission(user: UserProfile | null, key: PermissionKey): boolean {
  if (!user || user.status !== 'ACTIVE') {
    return false;
  }

  // Admin has all permissions.
  if (user.isAdmin) {
    return true;
  }
  
  // This part will be replaced with a real permission system based on roles
  // For now, we can keep some simple logic
  switch(key) {
      case 'ADMIN_ACCESS':
          return user.isAdmin;
      // Add more cases as needed for development
      default:
          return false;
  }

}
