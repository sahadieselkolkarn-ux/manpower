
import { type Timestamp } from 'firebase/firestore';

export interface ManpowerRequirement {
  positionId: string;
  positionName?: string; // Snapshot of the position name for display purposes
  count: number;
  requiredCertificateIds?: string[];
  requiredToolIds?: string[];
  requiredSkillTags?: string[];
  originalPositionId?: string; // For debugging repaired data
}

export interface Wave {
  id: string;
  waveCode: string;
  projectId: string;
  status: 'planned' | 'active' | 'closed';
  isDeleted?: boolean;
  deletedAt?: Timestamp;
  deletedBy?: string;
  manpowerRequirement: ManpowerRequirement[]; 
  planningWorkPeriod: {
    startDate: Timestamp;
    endDate: Timestamp;
  };
   actualWorkPeriod?: {
    startDate: Timestamp;
    endDate: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface WaveWithProject extends Wave {
    projectName: string;
    contractId: string;
    clientId: string;
    workMode: 'Onshore' | 'Offshore';
}
