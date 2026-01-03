
import { type Timestamp } from 'firebase/firestore';

export interface Pnd1Run {
  id: string;
  month: string; // YYYY-MM
  sourceType: "PAYROLL_RUN" | "TIMESHEET_BATCH";
  sourceId: string;
  status: "DRAFT" | "LOCKED" | "SUBMITTED";
  payer: {
    taxpayerId: string;
    branchNo?: string;
    legalName: string;
    address: string;
    signerName?: string;
    signerPosition?: string;
  };
  totals: {
    employeeCount: number;
    totalIncome: number;
    totalTax: number;
  };
  exports?: Array<{
    type: "csv" | "xlsx";
    storagePath: string;
    createdAt: Timestamp;
    createdBy: string;
  }>;
  createdAt: Timestamp;
  createdBy: string;
  lockedAt?: Timestamp;
  lockedBy?: string;
  submittedAt?: Timestamp;
  submittedBy?: string;
}

export interface Pnd1Line {
  id: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  taxpayerId: string;
  payDate: Timestamp;
  incomeAmount: number;
  taxAmount: number;
  incomeType: "40_1" | "40_1_2" | "40_2_RESIDENT" | "40_2_NONRESIDENT";
  withholdingCondition?: "1" | "2" | "3";
  details?: string;
  references?: {
    waveId?: string;
    projectId?: string;
    contractId?: string;
  };
  taxSnapshot?: {
    ly01Version?: number;
    ly01Status?: string;
    effectiveMonth?: string;
  };
  flags?: string[];
}
