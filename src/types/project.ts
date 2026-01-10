
import { type Timestamp } from 'firebase/firestore';

export interface Project {
  id: string;
  name: string;
  nameKey?: string;
  projectCode: string;
  workMode: 'Onshore' | 'Offshore';
  status: 'active' | 'inactive';
  note?: string;
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  deletedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface ProjectWithContract extends Project {
    clientId: string;
    clientName: string;
    contractId: string;
    contractName: string;
}
