import { type Timestamp } from 'firebase/firestore';

export interface ToolAssignment {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  toolId: string;
  toolName: string;
  toolCode: string;
  quantity: number;
  requisitionDate: Timestamp;
  waveId?: string;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
}

    