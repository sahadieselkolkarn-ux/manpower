import { Timestamp } from 'firebase/firestore';

export interface CooldownPolicy {
  id: string;
  policyVersion: string;
  effectiveFrom: Timestamp;
  matrix: {
    onshore_to_onshore: number;
    onshore_to_offshore: number;
    offshore_to_onshore: number;
    offshore_to_offshore: number;
  };
  note?: string;
  createdAt: Timestamp;
  createdBy: string;
}
