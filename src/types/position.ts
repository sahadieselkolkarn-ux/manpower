import { Timestamp } from 'firebase/firestore';

export type PositionType = 'OFFICE' | 'FIELD';

export interface Position {
  id: string;
  name: string;
  type: PositionType;
  onshoreCostPerDay: number;
  offshoreCostPerDay: number;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
