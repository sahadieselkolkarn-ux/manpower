

'use client';

import { type Timestamp } from 'firebase/firestore';

export interface Assignment {
  id: string;
  waveId: string;
  projectId: string; // Snapshot
  clientId: string;  // Snapshot
  
  employeeId: string;
  employeeCode: string; // Snapshot
  employeeName: string; // Snapshot
  employeeType: 'OFFICE' | 'FIELD'; // Snapshot

  positionId?: string;
  
  status: 'ACTIVE' | 'ENDED';
  
  startDate: string; // ISO "YYYY-MM-DD"
  endDate: string;   // ISO "YYYY-MM-DD"
  notes?: string;
  
  // Audit fields
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
  endedAt?: Timestamp;
  endedBy?: string;
}
