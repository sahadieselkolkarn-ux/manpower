import { type Timestamp } from 'firebase/firestore';

export type BillStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'VOID';

export interface BillAP {
  id: string;
  vendorName: string;
  billNo?: string;
  billDate: Timestamp;
  dueDate?: Timestamp;
  amount: number;
  currency?: string;
  category: string;
  contractId?: string;
  projectId?: string;
  attachment?: string;
  status: BillStatus;
  paidAmount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  note?: string;
}
