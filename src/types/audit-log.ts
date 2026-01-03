
import { type Timestamp } from 'firebase/firestore';

export interface AuditLog {
  id: string;
  timestamp: Timestamp;
  userId: string;
  userName: string;
  action: string;
  targetEntity: string;
  targetId: string;
  reason?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
}

    