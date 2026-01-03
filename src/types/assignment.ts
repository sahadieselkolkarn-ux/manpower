'use client';

import { type Timestamp } from 'firebase/firestore';

export type EligibilityStatus = 'PASS' | 'ALERT' | 'FAIL';

export interface Assignment {
  id: string;
  employeeId: string;
  employeeName: string; // Denormalized for display
  positionId: string;
  positionName: string; // Denormalized for display
  
  status: 'PENDING' | 'ASSIGNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  
  // Eligibility check results at time of assignment
  eligibility: {
    passportStatus: EligibilityStatus;
    certificateStatus: EligibilityStatus;
    cooldownStatus: EligibilityStatus;
    overall: EligibilityStatus;
    details: string[]; // Array of human-readable warning/fail messages
  };

  // Override information
  override: {
    overrideFlag: boolean;
    overrideReason?: string;
    overrideBy?: string;
    overrideAt?: Timestamp;
  };
  
  // Snapshots from Cooldown Policy at time of assignment
  policyVersion?: string;
  workModePair?: string;
  appliedRestDays?: number;

  assignedAt: Timestamp;
  assignedBy: string;

  costRateAtSnapshot?: number; // Snapshot from contract at time of confirmation
  sellRateAtSnapshot?: number; // Snapshot from contract at time of confirmation
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
