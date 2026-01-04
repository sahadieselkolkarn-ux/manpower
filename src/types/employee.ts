

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
    verifiedBySelf?: boolean;
    declaredDate?: Timestamp;
    data?: {
      personal?: {
        taxId?: string;
        address?: {
          building?: string;
          roomNo?: string;
          floor?: string;
          village?: string;
          houseNo?: string;
          moo?: string;
          soi?: string;
          road?: string;
          subDistrict?: string;
          district?: string;
          province?: string;
          postalCode?: string;
        };
      };
      marital?: {
        status?: "SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED";
        marriedDuringYear?: boolean;
        spouseHasIncome?: boolean;
      };
      children?: {
        totalCount?: number;
        allowance30kCount?: number;
        allowance60kCount?: number;
      };
      parents?: {
        self?: { father?: boolean; mother?: boolean };
        spouse?: { father?: boolean; mother?: boolean };
      };
      disability?: {
        dependentsCount?: number;
      };
      insuranceAndFunds?: {
        lifeInsuranceAmount?: number;
        healthInsuranceAmount?: number;
        selfParentsHealthInsuranceAmount?: number;
        spouseParentsHealthInsuranceAmount?: number;
        providentFundAmount?: number;
        governmentPensionFundAmount?: number;
        nationalSavingsFundAmount?: number;
        rmfAmount?: number;
        ltfAmount?: number;
      };
      otherDeductions?: {
        homeLoanInterestAmount?: number;
        socialSecurityAmount?: number;
        educationDonationAmount?: number;
        otherDonationAmount?: number;
        otherDonationDescription?: string;
      };
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
  userUid?: string; // Link to Firebase Auth User UID
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
