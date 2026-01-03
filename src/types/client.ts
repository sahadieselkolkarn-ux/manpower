import { type Timestamp } from 'firebase/firestore';

export interface Contact {
    name: string;
    department: string;
    email?: string;
    phone?: string;
}

export interface Client {
  id: string;
  clientCode: string;
  name: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  status: 'active' | 'inactive';
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
