
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
  Firestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { TimesheetLine, DayCategory, WorkType, TimesheetBatch } from '@/types/timesheet';
import { Contract, ContractOtRules, ContractDayPayRules } from '@/types/contract';
import { Project } from '@/types/project';
import { ManpowerCosting } from '@/types/manpower-costing';
import { PayrollLineItem, PayrollStatus } from '@/types/payroll';
import { OvertimeSettings, resolveDayCategory } from '../overtime/resolve-day-category';
import { Assignment } from '@/types/assignment';

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
  const baseHours = workMode === 'Onshore' ? otSettings.onshore.normalHours : otSettings.offshore.normalHours;

  const dayCategoryForCost = resolveDayCategory(workDateISO, otSettings.weekend, hrHolidayDates);
  const dayCategoryForSale = resolveDayCategory(workDateISO, otSettings.weekend, contractHolidayDates);

  const getDayPayMultiplier = (dayCategory: DayCategory, rules: ContractDayPayRules) => {
    if (dayCategory === 'WORKDAY') return 1;
    if (dayCategory === 'WEEKLY_HOLIDAY') return rules.weeklyHolidayDayMultiplier;
    if (dayCategory === 'CONTRACT_HOLIDAY') return rules.contractHolidayDayMultiplier;
    return 1;
  };

  const costDayMultiplier = getDayPayMultiplier(dayCategoryForCost, costDayRules);
  const saleDayMultiplier = getDayPayMultiplier(dayCategoryForSale, saleDayRules);
  
  let basePayCost = 0;
  let basePaySale = 0;

  if (workType === 'NORMAL') {
      const workRatio = baseHours > 0 ? Math.min(1, normalHours / baseHours) : 0;
      basePayCost = costDailyRate * workRatio * costDayMultiplier;
      basePaySale = saleDailyRate * workRatio * saleDayMultiplier;
  } else if (workType === 'STANDBY') {
      basePayCost = costDailyRate * 0.5 * costDayMultiplier;
      basePaySale = saleDailyRate * 0.5 * saleDayMultiplier;
  }

  let otPayCost = 0;
  let otPaySale = 0;

  if (workType === 'NORMAL' && otHours > 0) {
    const otDivisor = workMode === 'Onshore' ? otSettings.onshore.otDivisor : otSettings.offshore.otDivisor;
    
    if (otDivisor > 0) {
        const costOtBaseHourly = costDailyRate / otDivisor;
        const costOtMultiplier = costOtRules[dayCategoryForCost === 'WORKDAY' ? 'workdayMultiplier' : dayCategoryForCost === 'WEEKLY_HOLIDAY' ? 'weeklyHolidayMultiplier' : 'contractHolidayMultiplier'];
        otPayCost = otHours * costOtBaseHourly * costOtMultiplier;
        
        const saleOtBaseHourly = saleDailyRate / otDivisor;
        const saleOtMultiplier = saleOtRules[dayCategoryForSale === 'WORKDAY' ? 'workdayMultiplier' : dayCategoryForSale === 'WEEKLY_HOLIDAY' ? 'weeklyHolidayMultiplier' : 'contractHolidayMultiplier'];
        otPaySale = otHours * saleOtBaseHourly * saleOtMultiplier;
    }
  }

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


interface PayrollRunResult {
  payrollRunId: string;
  lineItems: PayrollLineItem[];
  saleLineItems: PayrollLineItem[];
  summary: {
    totalCost: number;
    totalSale: number;
    employees: number;
  };
}

const defaultOtRules: ContractOtRules = { workdayMultiplier: 1.5, weeklyHolidayMultiplier: 2, contractHolidayMultiplier: 3 };
const defaultDayRules: ContractDayPayRules = { weeklyHolidayDayMultiplier: 1, contractHolidayDayMultiplier: 1 };
const defaultOtSettings: OvertimeSettings = {
    weekend: { saturday: true, sunday: true },
    onshore: { normalHours: 8, otDivisor: 8 },
    offshore: { normalHours: 12, otDivisor: 14 }
};

export async function createPayrollRun(db: Firestore, batchId: string): Promise<PayrollRunResult> {
  // Check for existing payroll run
  const payrollRunRef = doc(db, 'payrolls', batchId);
  const existingPayrollSnap = await getDoc(payrollRunRef);
  if (existingPayrollSnap.exists()) {
    throw new Error(`Payroll run for batch ${batchId} already exists.`);
  }

  // 1. Fetch all necessary data in parallel
  const batchRef = doc(db, 'timesheetBatches', batchId);
  const linesQuery = query(collection(db, 'timesheetLines'), where('batchId', '==', batchId));
  const hrHolidaysRef = doc(db, 'hrSettings', 'publicHolidayCalendar');
  const otSettingsRef = doc(db, 'hrSettings', 'overtimeSettings');

  const [batchSnap, linesSnap, hrHolidaysSnap, otSettingsSnap] = await Promise.all([
    getDoc(batchRef),
    getDocs(linesQuery),
    getDoc(hrHolidaysRef),
    getDoc(otSettingsRef),
  ]);

  if (!batchSnap.exists()) throw new Error(`TimesheetBatch with ID ${batchId} not found.`);
  const batchData = batchSnap.data() as TimesheetBatch;
  if (batchData.status !== 'HR_APPROVED') throw new Error('Timesheet batch is not approved by HR.');
  const lines = linesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TimesheetLine));
  if (lines.length === 0) throw new Error('No timesheet lines found for this batch.');

  const contractRef = doc(db, `clients/${batchData.clientId}/contracts/${batchData.contractId}`);
  const contractSnap = await getDoc(contractRef);
  if (!contractSnap.exists()) throw new Error(`Contract ${batchData.contractId} not found.`);
  const contractData = contractSnap.data() as Contract;

  const hrHolidayDates: string[] = hrHolidaysSnap.exists() ? hrHolidaysSnap.data().dates || [] : [];
  const otSettings: OvertimeSettings = otSettingsSnap.exists() ? (otSettingsSnap.data() as OvertimeSettings) : defaultOtSettings;
  const contractHolidayDates: string[] = contractData.holidayCalendar?.dates || [];
  
  // Fetch all unique assignments and their related costing data
  const assignmentIds = [...new Set(lines.map(l => l.assignmentId))];
  const assignments: { [key: string]: Assignment } = {};
  const manpowerCostings: { [key: string]: ManpowerCosting } = {};

  await Promise.all(assignmentIds.map(async (id) => {
    const assignRef = doc(db, 'assignments', id);
    const assignSnap = await getDoc(assignRef);
    if (assignSnap.exists()) {
      const assignment = assignSnap.data() as Assignment;
      assignments[id] = assignment;

      if (!assignment.costRateAtSnapshot) {
        const costRef = doc(contractRef, 'manpowerCosting', assignment.positionId);
        const costSnap = await getDoc(costRef);
        if (costSnap.exists()) {
          manpowerCostings[assignment.positionId] = costSnap.data() as ManpowerCosting;
        }
      }
    }
  }));

  const employeeTotals = new Map<string, { cost: PayrollLineItem; sale: PayrollLineItem }>();

  // 2. Process each line
  for (const line of lines) {
    const assignment = assignments[line.assignmentId];
    if (!assignment) {
      console.warn(`Assignment ${line.assignmentId} not found for line ${line.id}. Skipping.`);
      continue;
    }

    const { workMode, positionId } = assignment;
    
    let costDailyRate = assignment.costRateAtSnapshot ?? 0;
    if (costDailyRate === 0) {
        const costing = manpowerCostings[positionId];
        if (costing) {
            costDailyRate = workMode === 'Onshore' ? costing.onshoreLaborCostDaily : costing.offshoreLaborCostDaily;
        }
    }

    let saleDailyRate = assignment.sellRateAtSnapshot ?? 0;
    if (saleDailyRate === 0) {
        const rateInfo = contractData.saleRates?.find(r => r.positionId === positionId);
        if (rateInfo) {
             saleDailyRate = workMode === 'Onshore' ? (rateInfo.onshoreSellDailyRateExVat ?? rateInfo.dailyRateExVat ?? 0) : (rateInfo.offshoreSellDailyRateExVat ?? rateInfo.dailyRateExVat ?? 0);
        }
    }

    const calcResult = calculatePayrollLine({
      timesheetLine: line,
      workMode,
      costDailyRate,
      saleDailyRate,
      costOtRules: contractData.payrollOtRules || defaultOtRules,
      saleOtRules: contractData.otRules || defaultOtRules,
      costDayRules: contractData.payrollDayRules || defaultDayRules,
      saleDayRules: contractData.billDayRules || defaultDayRules,
      otSettings,
      hrHolidayDates,
      contractHolidayDates,
    });
    
    // Accumulate totals per employee
    const current = employeeTotals.get(line.employeeId) ?? { 
        cost: { employeeId: line.employeeId, normalPay: 0, otPay: 0, totalPay: 0 },
        sale: { employeeId: line.employeeId, normalPay: 0, otPay: 0, totalPay: 0 }
    };
    current.cost.normalPay += calcResult.cost.normalPay;
    current.cost.otPay += calcResult.cost.otPay;
    current.cost.totalPay += calcResult.cost.totalPay;
    current.sale.normalPay += calcResult.sale.normalPay;
    current.sale.otPay += calcResult.sale.otPay;
    current.sale.totalPay += calcResult.sale.totalPay;
    employeeTotals.set(line.employeeId, current);
  }
  
  const finalLineItems = Array.from(employeeTotals.values());
  const costLineItems = finalLineItems.map(v => v.cost);
  const saleLineItems = finalLineItems.map(v => v.sale);
  const totalCost = costLineItems.reduce((sum, item) => sum + item.totalPay, 0);
  const totalSale = saleLineItems.reduce((sum, item) => sum + item.totalPay, 0);

  // 3. Save the PayrollRun document
  await setDoc(payrollRunRef, {
    cycleStartDate: batchData.periodStart,
    cycleEndDate: batchData.periodEnd,
    status: 'PENDING' as PayrollStatus,
    lineItems: costLineItems,
    saleLineItems: saleLineItems,
    createdAt: serverTimestamp(),
    processedAt: serverTimestamp(),
  });

  return {
    payrollRunId: payrollRunRef.id,
    lineItems: costLineItems,
    saleLineItems: saleLineItems,
    summary: {
      totalCost,
      totalSale,
      employees: employeeTotals.size,
    },
  };
}
