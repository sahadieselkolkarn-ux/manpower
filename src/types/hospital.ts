
import { type Timestamp } from 'firebase/firestore';

export interface Hospital {
  id: string;
  name: string;
  address?: string;
  emergencyPhone?: string;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

    