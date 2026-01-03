import { type Timestamp } from "firebase/firestore";

export type Department = "HR" | "OPERATION" | "FINANCE" | "MANAGEMENT" | "ADMIN";
export type RoleLevel = "OFFICER" | "MANAGER" | "SYSTEM";
export type RoleCode = 
    | "ADMIN"
    | "HR_OFFICER"
    | "HR_MANAGER"
    | "OPERATION_OFFICER"
    | "OPERATION_MANAGER"
    | "PAYROLL_OFFICER"
    | "FINANCE_OFFICER"
    | "FINANCE_MANAGER"
    | "MANAGEMENT_MANAGER";

export interface Role {
    id: string;
    code: RoleCode;
    department: Department;
    level: RoleLevel;
    description: string;
    isSystem: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  isAdmin: boolean;
  roleIds: string[]; // List of role IDs from /roles collection
  employeeId?: string; // Optional link to /employees collection
  status: "ACTIVE" | "DISABLED";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

