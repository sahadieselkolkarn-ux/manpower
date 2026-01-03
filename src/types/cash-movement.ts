import { type Timestamp } from 'firebase/firestore';

export type CashMovementType = 'IN' | 'OUT' | 'TRANSFER';
export type CashMovementSourceType = 'AR' | 'PAYROLL' | 'AP' | 'MANUAL' | 'TRANSFER';

export interface CashMovement {
    id: string;
    date: Timestamp;
    bankAccountId: string;
    type: CashMovementType;
    amount: number; // Always positive
    sourceType: CashMovementSourceType;
    sourceId?: string; // e.g., invoiceId, payrollRunId
    transferGroupId?: string; // To link two movements for a transfer
    reference?: string;
    note?: string;
    attachment?: string; // URL to file in Storage
    createdAt: Timestamp;
    createdBy: string; // Should be 'DEV' or a user's display name
}
