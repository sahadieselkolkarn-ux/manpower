import { type Timestamp } from 'firebase/firestore';

export interface Project {
  id: string;
  projectCode: string;
  contractId: string;
  name: string;
  workMode: 'Onshore' | 'Offshore';
  location?: string;
  status: 'active' | 'inactive';
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface ProjectWithContract extends Project {
    clientId: string;
    clientName: string;
    contractName: string;
}
