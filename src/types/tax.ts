import { type Timestamp } from 'firebase/firestore';

export type PersonType = 'OFFICE' | 'MP';
export type TaxProfileStatus = 'NOT_STARTED' | 'INCOMPLETE' | 'COMPLETE' | 'NEEDS_UPDATE';

export interface TaxProfile {
    id: string; // personKey
    personKey: string; // OFFICE:{officeEmployeeId} or MP:{manpowerEmployeeId}
    personType: PersonType;
    personRefId: string; // The original employee ID
    status: TaxProfileStatus;
    updatedAt: Timestamp;
    updatedBy: string;
    verifiedBySelf: boolean;
    verifiedAt?: Timestamp;
    personal: {
        fullName: string;
        taxId?: string;
        address?: string;
        phone?: string;
    };
    tax: {
        taxpayerStatus?: string;
        maritalStatus?: string;
        spouse?: any;
        dependentsCount?: number;
        allowances?: any;
        notes?: string;
    };
}
