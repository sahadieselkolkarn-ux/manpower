// This is a new file: src/types/manpower-costing.ts
import { type Timestamp } from 'firebase/firestore';

// OT Pay rules have been moved to the parent Contract document as `payrollOtRules`.
// This interface now only contains position-specific costing data.

export interface ManpowerCosting {
  id: string; // Same as positionId
  positionId: string;
  onshoreLaborCostDaily: number;
  offshoreLaborCostDaily: number;
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
  };
  after: {
    onshoreLaborCostDaily?: number;
    offshoreLaborCostDaily?: number;
  };
  effectiveFrom: Timestamp;
  note: string;
  changedAt: Timestamp;
  changedByUid: string;
  changedByName: string;
}
