import { type Timestamp } from 'firebase/firestore';

export type BankAccountType = 'current' | 'savings' | 'cash';

export interface BankAccount {
    id: string;
    bankName: string;
    accountName: string;
    accountNo: string;
    accountType: BankAccountType;
    currency: string;
    openingBalance: number;
    active: boolean;
    note?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdBy: string;
}
