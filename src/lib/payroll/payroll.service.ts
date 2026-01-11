
'use client';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  WriteBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming db is exported from a central firebase setup
import { TimesheetLine, DayCategory, WorkType } from '@/types/timesheet';
import { Contract, ContractOtRules, ContractDayPayRules } from '@/types/contract';
import { Project } from '@/types/project';
import { ManpowerCosting } from '@/types/manpower-costing';
import { PayrollLineItem, PayrollStatus } from '@/types/payroll';
import { OvertimeSettings, resolveDayCategory } from '../overtime/resolve-day-category';


interface CalculationInputs {
  timesheetLine: TimesheetLine;
  workMode: 'Onshore' | 'Offshore';
  costDailyRate: number;
  saleDailyRate: number;
  costOtRules: ContractOtRules;
  saleOtRules: ContractOtRules;
  costDayRules: ContractDayPayRules;
  saleDayRules: ContractDayPayRules;
  otSettings: OvertimeSettings;
  hrHolidayDates: string[]; // YYYY-MM-DD
  contractHolidayDates: string[]; // YYYY-MM-DD
}

interface CalculationResult {
  cost: PayrollLineItem;
  sale: PayrollLineItem;
}

/**
 * Calculates the payroll and sale value for a single timesheet line.
 * This is a pure function that takes all necessary data and returns the calculated amounts.
 */
export function calculatePayrollLine(inputs: CalculationInputs): CalculationResult {
  const { 
    timesheetLine, 
    workMode,
    costDailyRate,
    saleDailyRate,
    costOtRules,
    saleOtRules,
    costDayRules,
    saleDayRules,
    otSettings,
    hrHolidayDates,
    contractHolidayDates,
  } = inputs;

  const { workType, normalHours, otHours } = timesheetLine;
  const workDateISO = timesheetLine.workDate.toDate().toISOString().split('T')[0];

  // 1. Resolve Day Category for both Cost and Sale side
  const dayCategoryForCost = resolveDayCategory(workDateISO, otSettings.weekend, hrHolidayDates);
  const dayCategoryForSale = resolveDayCategory(workDateISO, otSettings.weekend, contractHolidayDates);

  // 2. Calculate Base Daily Pay (considers full day multipliers)
  const workTypeMultiplier = workType === 'NORMAL' ? 1.0 : workType === 'STANDBY' ? 0.5 : 0;
  
  const getDayPayMultiplier = (dayCategory: DayCategory, rules: ContractDayPayRules) => {
    if (dayCategory === 'WORKDAY') return 1;
    if (dayCategory === 'WEEKLY_HOLIDAY') return rules.weeklyHolidayDayMultiplier;
    if (dayCategory === 'CONTRACT_HOLIDAY') return rules.contractHolidayDayMultiplier;
    return 1;
  };

  const costDayMultiplier = getDayPayMultiplier(dayCategoryForCost, costDayRules);
  const saleDayMultiplier = getDayPayMultiplier(dayCategoryForSale, saleDayRules);
  
  const basePayCost = costDailyRate * workTypeMultiplier * costDayMultiplier;
  const basePaySale = saleDailyRate * workTypeMultiplier * saleDayMultiplier;

  // 3. Calculate OT Pay (if applicable)
  let otPayCost = 0;
  let otPaySale = 0;

  if (workType === 'NORMAL' && otHours > 0) {
    const otDivisor = workMode === 'Onshore' ? otSettings.onshore.otDivisor : otSettings.offshore.otDivisor;
    
    // Cost-side OT
    const costOtBaseHourly = costDailyRate / otDivisor;
    const costOtMultiplier = costOtRules[dayCategoryForCost === 'WORKDAY' ? 'workdayMultiplier' : dayCategoryForCost === 'WEEKLY_HOLIDAY' ? 'weeklyHolidayMultiplier' : 'contractHolidayMultiplier'];
    otPayCost = otHours * costOtBaseHourly * costOtMultiplier;
    
    // Sale-side OT
    const saleOtBaseHourly = saleDailyRate / otDivisor;
    const saleOtMultiplier = saleOtRules[dayCategoryForSale === 'WORKDAY' ? 'workdayMultiplier' : dayCategoryForSale === 'WEEKLY_HOLIDAY' ? 'weeklyHolidayMultiplier' : 'contractHolidayMultiplier'];
    otPaySale = otHours * saleOtBaseHourly * saleOtMultiplier;
  }

  // 4. Consolidate results
  return {
    cost: {
      employeeId: timesheetLine.employeeId,
      normalPay: basePayCost,
      otPay: otPayCost,
      totalPay: basePayCost + otPayCost,
    },
    sale: {
      employeeId: timesheetLine.employeeId,
      normalPay: basePaySale,
      otPay: otPaySale,
      totalPay: basePaySale + otPaySale,
    },
  };
}

// NOTE: The rest of this file is a placeholder as the full payroll run implementation
// is complex and depends on many factors not yet fully built.
// The key part is that `calculatePayrollLine` is now updated and ready.

interface PayrollRunResult {
  payrollRunId: string;
  lineItems: { cost: PayrollLineItem; sale: PayrollLineItem }[];
  summary: {
    totalCost: number;
    totalSale: number;
    employees: number;
  };
}

/**
 * Creates a PayrollRun for a given timesheet batch.
 * It fetches all necessary data, calculates each line, and stores the snapshot.
 * THIS IS A PLACEHOLDER IMPLEMENTATION for demonstration.
 */
export async function createPayrollRun(
  batch: WriteBatch,
  batchId: string,
  cycleStartDate: Date,
  cycleEndDate: Date
): Promise<PayrollRunResult> {
  const linesQuery = query(
    collection(db, 'timesheetLines'),
    where('batchId', '==', batchId)
  );
  const linesSnap = await getDocs(linesQuery);
  const lines = linesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TimesheetLine));

  if (lines.length === 0) {
    throw new Error('No timesheet lines found for this batch.');
  }

  // TODO: In a real scenario, you must fetch all the required data:
  // - OvertimeSettings from hrSettings/overtimeSettings
  // - HR Holiday Calendar from hrSettings/publicHolidayCalendar
  // - For each line, get the corresponding assignment, then contract, project, manpowerCosting
  
  // This is a mock implementation for demonstration.
  const mockOtSettings: OvertimeSettings = {
    weekend: { saturday: true, sunday: true },
    onshore: { normalHours: 8, otDivisor: 8 },
    offshore: { normalHours: 12, otDivisor: 14 },
  };

  const lineItems: { cost: PayrollLineItem; sale: PayrollLineItem }[] = [];
  const employeeTotals = new Map<string, { cost: PayrollLineItem, sale: PayrollLineItem }>();
  
  const payrollRunRef = doc(collection(db, 'payrolls'));
  batch.set(payrollRunRef, {
    cycleStartDate,
    cycleEndDate,
    status: 'PENDING' as PayrollStatus,
    lineItems: [],
    createdAt: serverTimestamp(),
  });

  const summary = { totalCost: 0, totalSale: 0, employees: 0 };

  return {
    payrollRunId: payrollRunRef.id,
    lineItems: [],
    summary,
  };
}
