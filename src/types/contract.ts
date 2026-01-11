
'use client';

import { type Timestamp } from 'firebase/firestore';

export interface ContractCommercialItem {
  id: string;
  contractId: string;
  catalogItemId: string; // From Admin Commercial Catalog
  itemCodeSnapshot: string;
  itemNameSnapshot: string;
  unitSnapshot: string;
  price: number;
  triggerType: string; // e.g., 'DELIVERED'|'INSTALLED'|'MILESTONE'|'OTHER'
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContractSaleRate {
    positionId: string;
    dailyRateExVat?: number; // Legacy, for fallback
    onshoreSellDailyRateExVat?: number;
    offshoreSellDailyRateExVat?: number;
}

export interface ContractOtRules {
    workdayMultiplier: number;
    weeklyHolidayMultiplier: number;
    contractHolidayMultiplier: number;
}

export interface ContractHoliday {
    date: string; // YYYY-MM-DD format
    label?: string;
}

export interface ContractFile {
    fileName: string;
    fileRef: string; // Path in Firebase Storage
    uploadedAt: Timestamp;
    uploadedBy: string;
}

export interface Contract {
  id: string;
  name: string;
  clientId: string;
  status: 'active' | 'inactive' | 'DELETED';
  isLocked: boolean;
  lockedAt?: Timestamp;
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  deletedBy?: string;
  saleRates?: ContractSaleRate[];
  otRules?: ContractOtRules; // For Sales/Billing
  payrollOtRules?: ContractOtRules; // For HR/Payroll
  holidayCalendar?: {
      timezone: 'Asia/Bangkok';
      dates: string[]; // YYYY-MM-DD format
  };
  contractFiles?: ContractFile[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  pricingChangeLogs?: { note: string; at: Timestamp; by: string }[];
}

export interface ContractWithClient extends Contract {
    clientName: string;
}
