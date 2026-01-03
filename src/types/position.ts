import { Timestamp } from 'firebase/firestore';

export type PositionType = 'OFFICE' | 'FIELD';

/**
 * @deprecated Use ManpowerPosition or OfficePosition instead.
 */
export interface LegacyPosition {
  id: string;
  name: string;
  type: PositionType;
  costRateOnshore?: number;
  costRateOffshore?: number;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ManpowerPosition {
  id: string;
  name: string;
  description?: string;
  costRateOnshore: number;
  costRateOffshore: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OfficePosition {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
