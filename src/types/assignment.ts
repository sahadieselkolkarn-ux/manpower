'use client';

import { type Timestamp } from 'firebase/firestore';

export type EligibilityStatus = 'PASS' | 'ALERT' | 'FAIL';

export interface Assignment {
  id: string;
  waveId: string;
  employeeId: string;
  positionId: string;
  positionName?: string; // Denormalized for display

  // Denormalized from Wave for rule calculation
  workMode: 'Onshore' | 'Offshore';
  
  // Snapshots from Cooldown Policy at time of assignment
  policyVersion?: string;
  workModePair?: 'onshore_to_onshore' | 'onshore_to_offshore' | 'offshore_to_onshore' | 'offshore_to_offshore';
  appliedRestDays?: number;

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
  
  status: 'PENDING' | 'ASSIGNED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  assignedAt: Timestamp;
  assignedBy: string;

  costRateAtSnapshot?: number; // Snapshot from contract at time of confirmation
  sellRateAtSnapshot?: number; // Snapshot from contract at time of confirmation
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
