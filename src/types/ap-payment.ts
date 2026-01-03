import { type Timestamp } from 'firebase/firestore';

export interface APPayment {
  id: string;
  billId: string;
  paidAt: Timestamp;
  amount: number;
  method: 'bank' | 'cash' | 'transfer';
  reference?: string;
  bankAccountId: string;
  note?: string;
  createdAt: Timestamp;
  createdBy: string;
}
