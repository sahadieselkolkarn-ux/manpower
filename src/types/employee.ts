


'use client';
import { type Timestamp } from 'firebase/firestore';
import { OfficeAttendancePolicy } from './attendance';

export interface WorkHistoryItem {
  waveId: string;
  projectId: string;
  contractId: string;
  clientId: string;
  path: string; // e.g., 'clients/{clientId}/contracts/{contractId}/projects/{projectId}/waves/{waveId}'
  workMode: 'Onshore' | 'Offshore';
  actualStartDate: Timestamp;
  actualEndDate: Timestamp;
}

export interface DocumentInfo {
  type: 'Passport' | 'Seaman Book' | 'Certificate';
  name: string; // For Passport, this is the Passport Number. For Certificate, it's the certificate name/description.
  issueDate?: Timestamp;
  expiryDate?: Timestamp;
  fileUrl?: string;
  // For Certificates, this links to the master list
  certificateTypeId?: string; 
}

export interface Ly01Attachment {
    type: "LY01_PDF"|"ID"|"MARRIAGE"|"CHILD"|"INSURANCE"|"FUND"|"HOMELOAN"|"OTHER";
    fileName: string;
    storagePath: string;
    uploadedAt: Timestamp;
    uploadedBy: string;
}

export interface Ly01Audit {
    action: "INIT"|"SAVE_DRAFT"|"SUBMIT"|"VERIFY"|"UPLOAD";
    at: Timestamp;
    by: string;
    note?: string;
}

export interface Ly01Profile {
    status: "MISSING" | "DRAFT" | "SUBMITTED" | "VERIFIED";
    effectiveMonth: string; // YYYY-MM
    version: number;
    updatedAt: Timestamp;
    updatedBy: string;
    verifiedAt?: Timestamp;
    verifiedBy?: string;
    data: {
        maritalStatus?: "single"|"married"|"divorced"|"widowed";
        spouseHasIncome?: boolean;
        childrenCountTotal?: number;
        childrenEligible30k?: number;
        childrenEligible60k?: number;
        parentsSupport?: { selfFather?: boolean; selfMother?: boolean; spouseFather?: boolean; spouseMother?: boolean; };
        disabledDependentsCount?: number;
        lifeInsuranceAmount?: number;
        healthInsuranceAmount?: number;
        healthInsuranceParentsAmount?: number;
        providentFundAmount?: number;
        rmfAmount?: number;
        otherRetirementFundAmount?: number;
        homeLoanInterestAmount?: number;
        socialSecurityAmount?: number;
        donationGeneralAmount?: number;
        donationEducationAmount?: number;
        otherDeductionNote?: string;
    };
    attachments?: Ly01Attachment[];
    audit?: Ly01Audit[];
}

export interface EmploymentTerms {
  type: "SALARY";
  baseSalary: number;
  allowance?: number;
  socialSecurityEligible: boolean;
  taxEligible: boolean;
  payFrequency: "MONTHLY";
  effectiveFrom: string; // YYYY-MM
  status: "ACTIVE";
  history?: Array<{
    baseSalary: number;
    allowance?: number;
    effectiveFrom: string;
    effectiveTo?: string;
    changedBy: string;
    changedAt: Timestamp;
    reason?: string;
  }>
}

export interface Employee {
  id: string;
  employeeCode: string;
  employeeType: "OFFICE" | "FIELD";
  orgLevel?: "STAFF" | "MANAGER" | "EXECUTIVE";
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth?: Timestamp;
    nationalId?: string;
    address?: string;
    emergencyContact?: {
        name: string;
        relationship: string;
        phone: string;
    };
  };
  contactInfo: {
    phone?: string;
    email?: string;
  };
  financeInfo?: {
    bankName?: string;
    accountNumber?: string;
    socialSecurity?: {
        has: boolean;
        hospitalId?: string;
    }
  };
  employmentTerms?: EmploymentTerms;
  taxProfile?: {
      ly01?: Ly01Profile;
  };
  positionIds: string[]; // Refers to IDs in /positions
  skillTags?: string[];
  employmentStatus: 'Active' | 'Inactive' | 'Terminated';
  assignmentStatus?: 'Available' | 'Assigned' | 'On Cooldown';
  workHistory?: WorkHistoryItem[];
  documents?: DocumentInfo[];
  officeProfile?: {
      attendanceOverride?: Partial<OfficeAttendancePolicy>;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
