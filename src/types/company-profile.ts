import { Timestamp } from 'firebase/firestore';

export interface CompanyProfile {
  id: 'PRIMARY';
  legalNameTH: string;
  legalNameEN?: string;
  taxId: string;
  branchNo?: string;
  addressLine1: string;
  addressLine2?: string;
  district?: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  logoFileRef?: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
