

'use client';

import { type Timestamp } from 'firebase/firestore';

export type EligibilityStatus = "PASS" | "ALERT" | "FAIL";

export interface Assignment {
  id: string;
  waveId: string;
  projectId: string; // Snapshot
  clientId: string;  // Snapshot
  contractId: string; // Snapshot
  
  employeeId: string;
  employeeCode: string; // Snapshot
  employeeName: string; // Snapshot
  employeeType: 'OFFICE' | 'FIELD'; // Snapshot

  positionId: string;
  positionName: string; // Snapshot
  workMode: 'Onshore' | 'Offshore'; // Snapshot
  
  status: 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string;   // ISO "YYYY-MM-DD"
  notes?: string;

  assignedAt: Timestamp;
  assignedBy: string;

  eligibility?: {
    passportStatus: EligibilityStatus;
    certificateStatus: EligibilityStatus;
    cooldownStatus: EligibilityStatus;
    overall: EligibilityStatus;
    details: string[];
  };

  override?: {
    overrideFlag: boolean;
    overrideReason?: string;
    overrideBy?: string;
    overrideAt?: Timestamp;
  };

  policyVersion?: string; // Cooldown policy version
  workModePair?: string; // e.g. "onshore_to_offshore"
  appliedRestDays?: number;

  costRateAtSnapshot?: number;
  sellRateAtSnapshot?: number;
  
  // Audit fields
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  endedAt?: Timestamp;
  endedBy?: string;
}
