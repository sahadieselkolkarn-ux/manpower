import { type Timestamp } from 'firebase/firestore';

export interface Tool {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  availableQuantity: number;
  assignedQuantity: number;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
