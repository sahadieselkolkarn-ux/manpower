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
  transactionDate: Timestamp;
  transactionType: 'CHECKOUT' | 'RETURN';
  waveId?: string;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
}

    