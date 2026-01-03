
import { type Timestamp } from 'firebase/firestore';

export interface ARPayment {
  id: string;
  invoiceType: 'manpower' | 'commercial';
  invoiceId: string;
  paidAt: Timestamp;
  amount: number; // Net cash received
  whtAmount?: number; // WHT amount declared in this payment
  whtFileRef?: string; // File reference for WHT certificate
  method: 'bank' | 'cash' | 'transfer';
  reference?: string;
  bankAccountId: string;
  note?: string;
  createdAt: Timestamp;
  createdBy: string;
}
