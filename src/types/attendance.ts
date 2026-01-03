
import { type Timestamp } from 'firebase/firestore';

export interface OfficeAttendancePolicy {
  workingDays: { mon: boolean, tue: boolean, wed: boolean, thu: boolean, fri: boolean, sat: boolean, sun: boolean };
  workHours: { startTime: string, endTime: string, breakMinutes: number };
  gracePeriodMinutes: number;
  payrollProration: {
    method: "WORKDAYS" | "CALENDAR_DAYS",
    dailyRateBase: "BASE_ONLY" | "BASE_PLUS_ALLOWANCE"
  };
  lateDeductionRule: {
    mode: "PER_MINUTE" | "PER_BLOCK" | "PER_DAY",
    perMinuteRate?: number,
    blocks?: Array<{ uptoMinutes: number, deductionMinutes: number }>
  };
  absenceRule: {
    countNoShowAsAbsent: boolean,
    deductionMode: "DAILY_RATE" | "FIXED",
    fixedAmount?: number
  };
  paidLeaveTypes: string[],
  unpaidLeaveTypes: string[],
  requireManagerApproval: boolean;
}

export interface AttendanceDaily {
  id: string; // employeeId_yyyyMMdd
  employeeId: string;
  date: Timestamp;
  status: "PRESENT" | "LATE" | "LEAVE" | "ABSENT" | "HOLIDAY" | "WEEKEND";
  checkInAt?: Timestamp;
  checkOutAt?: Timestamp;
  lateMinutes?: number;
  leaveType?: string; // "ANNUAL", "SICK", "UNPAID" etc.
  note?: string;
  source: "MANUAL" | "IMPORT" | "DEVICE";
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
}

export interface AttendanceBatch {
  id: string; // YYYY-MM
  month: string;
  status: "DRAFT" | "HR_APPROVED" | "LOCKED";
  calendarId: string;
  totals: {
    employeeCount: number;
    workdaysInMonth: number;
  };
  createdAt: Timestamp;
  createdBy: string;
  approvedAt?: Timestamp;
  approvedBy?: string;
  lockedAt?: Timestamp;
  lockedBy?: string;
}

export interface AttendanceBatchLine {
  employeeId: string;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  lateMinutesTotal: number;
  flags: string[];
}
