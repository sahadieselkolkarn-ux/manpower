// This is a new file: src/types/manpower-costing.ts
import { type Timestamp } from 'firebase/firestore';

export interface OtPayRules {
  workdayMultiplier: number;
  weeklyHolidayMultiplier: number;
  contractHolidayMultiplier: number;
}

export interface ManpowerCosting {
  id: string; // Same as positionId
  positionId: string;
  onshoreLaborCostDaily: number;
  offshoreLaborCostDaily: number;
  otPayRules?: OtPayRules; // HR-defined OT rules for payroll
  effectiveFrom: Timestamp;
  note?: string;
  updatedAt: Timestamp;
  updatedByUid: string;
  updatedByName: string;
}

export interface ManpowerCostingHistory {
  id: string;
  positionId: string;
  before: {
    onshoreLaborCostDaily?: number;
    offshoreLaborCostDaily?: number;
    otPayRules?: OtPayRules;
  };
  after: {
    onshoreLaborCostDaily?: number;
    offshoreLaborCostDaily?: number;
    otPayRules?: OtPayRules;
  };
  effectiveFrom: Timestamp;
  note: string;
  changedAt: Timestamp;
  changedByUid: string;
  changedByName: string;
}
