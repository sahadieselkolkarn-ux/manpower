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
    dailyRateExVat: number;
}

export interface ContractOtRules {
    workdayMultiplier: number;
    weeklyHolidayMultiplier: number;
    contractHolidayMultiplier: number;
}

export interface ContractHolidayCalendar {
    timezone: 'Asia/Bangkok';
    dates: string[]; // YYYY-MM-DD format
    updatedAt?: Timestamp;
    updatedBy?: string;
}

export interface ContractFile {
    fileName: string;
    fileRef: string;
    uploadedAt: Timestamp;
}

export interface Contract {
  id: string;
  name: string;
  clientId: string;
  status: 'active' | 'inactive';
  isLocked: boolean;
  lockedAt?: Timestamp;
  saleRates?: ContractSaleRate[];
  otRules?: ContractOtRules;
  holidayCalendar?: ContractHolidayCalendar;
  contractFiles?: ContractFile[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface ContractWithClient extends Contract {
    clientName: string;
}
