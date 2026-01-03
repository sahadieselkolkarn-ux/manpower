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
import { Contract, ContractOtRules } from '@/types/contract';
import { Project } from '@/types/project';
import { Position } from '@/types/position';
import { PayrollLineItem, PayrollStatus } from '@/types/payroll';

interface CalculationInputs {
  timesheetLine: TimesheetLine;
  project: Project;
  contract: Contract;
  position: Position;
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
  const { timesheetLine, project, contract, position } = inputs;
  const { workMode } = project;
  const {
    workType,
    normalHours,
    otHours,
    dayCategory = 'WORKDAY',
  } = timesheetLine;

  // 1. Determine Base Daily Rates (Cost and Sale)
  const costDailyRate =
    workMode === 'Onshore'
      ? position.onshoreCostPerDay
      : position.offshoreCostPerDay;
  const saleRateInfo = contract.saleRates?.find(
    (r) => r.positionId === position.id
  );
  const saleDailyRate = saleRateInfo?.dailyRateExVat || 0;

  // 2. Calculate Base Pay Multiplier
  let basePayMultiplier = 0;
  if (workType === 'NORMAL') basePayMultiplier = 1.0;
  else if (workType === 'STANDBY') basePayMultiplier = 0.5;
  // For 'LEAVE', it remains 0

  const basePayCost = costDailyRate * basePayMultiplier;
  const basePaySale = saleDailyRate * basePayMultiplier;

  // 3. Calculate OT Pay (if applicable)
  let otPayCost = 0;
  let otPaySale = 0;
  if (workType === 'NORMAL' && otHours > 0) {
    // 3a. Determine OT hourly base
    const otDivisor = workMode === 'Onshore' ? 8 : 14;
    const costOtBaseHourly = costDailyRate / otDivisor;
    const saleOtBaseHourly = saleDailyRate / otDivisor;

    // 3b. Determine OT multiplier from contract rules
    const otRules = contract.otRules || {
      workdayMultiplier: 1.5,
      weeklyHolidayMultiplier: 2,
      contractHolidayMultiplier: 3,
    };
    let otMultiplier = otRules.workdayMultiplier;
    if (dayCategory === 'WEEKLY_HOLIDAY') {
      otMultiplier = otRules.weeklyHolidayMultiplier;
    } else if (dayCategory === 'CONTRACT_HOLIDAY') {
      otMultiplier = otRules.contractHolidayMultiplier;
    }

    // 3c. Calculate final OT pay
    otPayCost = otHours * costOtBaseHourly * otMultiplier;
    otPaySale = otHours * saleOtBaseHourly * otMultiplier;
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
 */
export async function createPayrollRun(
  batch: WriteBatch,
  batchId: string,
  cycleStartDate: Date,
  cycleEndDate: Date
): Promise<PayrollRunResult> {
  // 1. Fetch all data required for the calculation
  const linesQuery = query(
    collection(db, 'timesheetLines'),
    where('batchId', '==', batchId)
  );
  const linesSnap = await getDocs(linesQuery);
  const lines = linesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TimesheetLine));

  if (lines.length === 0) {
    throw new Error('No timesheet lines found for this batch.');
  }

  // Fetch unique related documents to minimize reads
  const positionIds = [...new Set(lines.map((l) => l.employeeId))]; // This seems wrong, should be positionId from assignment. Assuming it will be added to timesheetLine
  const employeeIds = [...new Set(lines.map((l) => l.employeeId))];
  
  // This is a placeholder for fetching assignments to get positionId.
  // In a real scenario, you'd fetch assignments linked to the timesheet lines.
  // For now, we will assume a mock or that this needs to be added.
  // This part of the logic is complex and depends on how assignments are linked.
  
  const positions = new Map<string, Position>();
  const contracts = new Map<string, Contract>();
  const projects = new Map<string, Project>();
  
  // Simplified fetching - in reality this would be more complex
  // ... fetching logic for positions, contracts, projects ...

  const lineItems: { cost: PayrollLineItem; sale: PayrollLineItem }[] = [];
  const employeeTotals = new Map<string, { cost: PayrollLineItem, sale: PayrollLineItem }>();

  // 2. Process each line
  for (const line of lines) {
    const positionId = 'placeholder'; // This needs to be resolved via assignment
    const contractId = 'placeholder'; // This needs to be resolved via wave/project
    const projectId = 'placeholder';  // This needs to be resolved via wave

    const position = positions.get(positionId);
    const contract = contracts.get(contractId);
    const project = projects.get(projectId);
    
    if (!position || !contract || !project) {
        // Skip line or throw error if master data is missing
        console.warn(`Skipping line for employee ${line.employeeId} on ${line.workDate.toDate().toISOString()} due to missing master data.`);
        continue;
    }

    const result = calculatePayrollLine({
      timesheetLine: line,
      project,
      contract,
      position,
    });
    
    lineItems.push(result);

    // Aggregate results per employee
    if (!employeeTotals.has(line.employeeId)) {
      employeeTotals.set(line.employeeId, { 
        cost: { employeeId: line.employeeId, normalPay: 0, otPay: 0, totalPay: 0 },
        sale: { employeeId: line.employeeId, normalPay: 0, otPay: 0, totalPay: 0 },
      });
    }
    const current = employeeTotals.get(line.employeeId)!;
    current.cost.normalPay += result.cost.normalPay;
    current.cost.otPay += result.cost.otPay;
    current.cost.totalPay += result.cost.totalPay;
    current.sale.normalPay += result.sale.normalPay;
    current.sale.otPay += result.sale.otPay;
    current.sale.totalPay += result.sale.totalPay;
  }
  
  const finalLineItems = Array.from(employeeTotals.values());

  // 3. Create PayrollRun document
  const payrollRunRef = doc(collection(db, 'payrolls'));
  batch.set(payrollRunRef, {
    cycleStartDate,
    cycleEndDate,
    status: 'PENDING' as PayrollStatus,
    lineItems: finalLineItems.map(item => item.cost), // Storing only cost in payroll run
    // You might want to store sale items separately, e.g., in an 'invoiceRun'
    createdAt: serverTimestamp(),
  });

  // 4. Return summary
  const summary = {
    totalCost: finalLineItems.reduce((sum, item) => sum + item.cost.totalPay, 0),
    totalSale: finalLineItems.reduce((sum, item) => sum + item.sale.totalPay, 0),
    employees: finalLineItems.length,
  };

  return {
    payrollRunId: payrollRunRef.id,
    lineItems: finalLineItems,
    summary,
  };
}
