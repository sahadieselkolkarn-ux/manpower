import { Timestamp } from 'firebase/firestore';

export type CertificateCategory = 'OFFICE' | 'FIELD' | 'GENERAL';

export interface CertificateType {
  id: string;
  code: string;
  name: string;
  type: CertificateCategory;
  requiresExpiry: boolean;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
