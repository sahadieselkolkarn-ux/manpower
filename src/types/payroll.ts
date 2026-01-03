
import { type Timestamp } from 'firebase/firestore';

export type PayrollStatus = 'PENDING' | 'PROCESSED' | 'PAID';

export interface PayrollLineItem {
    employeeId: string;
    normalPay: number;
    otPay: number;
    totalPay: number;
}

export interface Payroll {
  id: string;
  cycleStartDate: Timestamp;
  cycleEndDate: Timestamp;
  status: PayrollStatus;
  lineItems: PayrollLineItem[]; // This stores the COST side of the calculation
  processedBy?: string;
  processedAt?: Timestamp;
  paidAt?: Timestamp;
  // Optional: Add a snapshot of the sale-side calculation for invoicing reference
  saleLineItems?: PayrollLineItem[];
  createdAt: Timestamp;
}
