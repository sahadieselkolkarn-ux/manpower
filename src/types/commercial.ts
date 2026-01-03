import { type Timestamp } from 'firebase/firestore';

// From Admin Module
export interface CommercialCatalogItem {
  id: string;
  code: string;
  name: string;
  defaultUnit: string;
  description?: string;
  active: boolean;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}


// From Operation Module
export interface CommercialActivation {
  id: string;
  contractId: string;
  contractItemId: string; // Ref to ContractCommercialItem
  level: 'project' | 'wave';
  refId: string; // projectId or waveId
  qtyPlanned: number;
  unitSnapshot: string;
  status: 'PLANNED' | 'READY_TO_BILL' | 'APPROVED_FOR_BILLING' | 'INVOICED';
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface CommercialTriggerEvent {
  id: string;
  activationId: string;
  occurredAt: Timestamp;
  qtyActual?: number;
  evidenceFiles?: string[]; // Array of fileRef strings
  ownerDept: 'operation' | 'hr';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: Timestamp;
  reason?: string; // for reject
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
