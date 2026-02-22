
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
  /** @deprecated legacy, costs are per-contract in manpowerCosting */
  costRateOnshore?: number;
  /** @deprecated legacy, costs are per-contract in manpowerCosting */
  costRateOffshore?: number;
  requiredCertificateIds?: string[];
  requiredToolIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OfficePosition {
  id: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
