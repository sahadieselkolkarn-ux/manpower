
import { type Timestamp } from 'firebase/firestore';

export type TimesheetBatchStatus =
  | 'CLIENT_APPROVED_RECEIVED'
  | 'VALIDATED'
  | 'HR_APPROVED'
  | 'REVOKED';

export interface TimesheetBatch {
  id: string;
  clientId: string;
  contractId: string;
  projectId: string;
  waveId: string; // Made non-optional
  periodStart: Timestamp;
  periodEnd: Timestamp;
  templateVersion: string;
  sourceFiles?: { name: string; fileRef?: string }[];
  status: TimesheetBatchStatus;
  approvedBy?: string;
  approvedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export type WorkType = 'NORMAL' | 'STANDBY' | 'LEAVE';
export type DayCategory = 'WORKDAY' | 'WEEKLY_HOLIDAY' | 'CONTRACT_HOLIDAY';

export interface TimesheetLine {
  id: string;
  batchId: string;
  assignmentId: string; // Link to assignment instead of just employeeId
  employeeId: string; // Denormalized for easier lookup
  workDate: Timestamp;
  workType: WorkType;
  normalHours: number;
  otHours: number;
  dayCategory?: DayCategory; // Derived
  anomalies?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
