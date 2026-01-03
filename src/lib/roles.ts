import { Role } from "@/types/user";

// This data should be seeded into the /roles collection in Firestore.
export const ROLES_SEED_DATA: Omit<Role, 'id'>[] = [
  {
    code: "ADMIN",
    department: "ADMIN",
    level: "SYSTEM",
    description: "Full system access.",
    isSystem: true
  },
  {
    code: "HR_OFFICER",
    department: "HR",
    level: "OFFICER",
    description: "Manages employee data and HR processes.",
    isSystem: false
  },
  {
    code: "HR_MANAGER",
    department: "HR",
    level: "MANAGER",
    description: "Oversees HR operations and approves HR-related tasks.",
    isSystem: false
  },
  {
    code: "OPERATION_OFFICER",
    department: "OPERATION",
    level: "OFFICER",
    description: "Manages day-to-day manpower and wave assignments.",
    isSystem: false
  },
  {
    code: "OPERATION_MANAGER",
    department: "OPERATION",
    level: "MANAGER",
    description: "Oversees all operational activities, contracts, and projects.",
    isSystem: false
  },
  {
    code: "PAYROLL_OFFICER",
    department: "FINANCE",
    level: "OFFICER",
    description: "Prepares payroll data.",
    isSystem: false
  },
  {
    code: "FINANCE_OFFICER",
    department: "FINANCE",
    level: "OFFICER",
    description: "Prepares financial documents and tax forms like P.N.D.1.",
    isSystem: false
  },
  {
    code: "FINANCE_MANAGER",
    department: "FINANCE",
    level: "MANAGER",
    description: "Approves payroll and tax submissions, manages all financial operations.",
    isSystem: false
  },
  {
    code: "MANAGEMENT_MANAGER",
    department: "MANAGEMENT",
    level: "MANAGER",
    description: "General management with broad oversight.",
    isSystem: false
  }
];

// Helper functions for role checks (will be more complex with permissions)
// For now, these are simple checks on role codes.

export const hasRole = (user: { roleIds: string[] } | null, roles: Role[], targetRoleCode: string): boolean => {
    if (!user) return false;
    const targetRole = roles.find(r => r.code === targetRoleCode);
    if (!targetRole) return false;
    return user.roleIds.includes(targetRole.id);
};

export const isHROfficer = (user: { roleIds: string[] } | null, roles: Role[]) => hasRole(user, roles, 'HR_OFFICER');
export const isHRManager = (user: { roleIds: string[] } | null, roles: Role[]) => hasRole(user, roles, 'HR_MANAGER');
export const isOperationOfficer = (user: { roleIds: string[] } | null, roles: Role[]) => hasRole(user, roles, 'OPERATION_OFFICER');
export const isOperationManager = (user: { roleIds: string[] } | null, roles: Role[]) => hasRole(user, roles, 'OPERATION_MANAGER');
export const isFinanceManager = (user: { roleIds: string[] } | null, roles: Role[]) => hasRole(user, roles, 'FINANCE_MANAGER');

