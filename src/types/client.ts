
import { type Timestamp } from 'firebase/firestore';

export interface Contact {
    name: string;
    department: string;
    email?: string;
    phone?: string;
}

export interface Client {
  id: string;
  name: string;
  nameKey?: string;
  shortName?: string;
  address?: string;
  taxId?: string;
  contacts?: Contact[];
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  deletedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
