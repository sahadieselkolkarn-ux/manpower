
import { type Timestamp } from "firebase/firestore";

export type Department = "HR" | "OPERATION" | "FINANCE" | "MANAGEMENT" | "ADMIN" | "CUSTOM";
export type RoleLevel = "OFFICER" | "MANAGER" | "SYSTEM" | "CUSTOM";
export type RoleCode = 
    | "ADMIN"
    | "HR_OFFICER"
    | "HR_MANAGER"
    | "OPERATION_OFFICER"
    | "OPERATION_MANAGER"
    | "PAYROLL_OFFICER"
    | "FINANCE_OFFICER"
    | "FINANCE_MANAGER"
    | "MANAGEMENT_MANAGER"
    | (string & {}); // Allow for custom string codes

export interface Role {
    id: string;
    name: string;
    code: RoleCode;
    department: Department;
    level: RoleLevel;
    description: string;
    isSystem: boolean;
    isProtected?: boolean; // True for standard roles that shouldn't be deleted/edited by UI
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  phone?: string;
  isAdmin: boolean;
  roleIds: string[];
  roleCodes: RoleCode[];
  employeeId?: string; // Optional link to /employees collection
  status: "ACTIVE" | "DISABLED" | "PENDING";
  requestedRoleCode?: RoleCode;
  requestedAt?: Timestamp;
  approvedAt?: Timestamp | null;
  approvedByUid?: string | null;
  approvedByName?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
