'use client';
import {
  doc,
  getDoc,
  collection,
  writeBatch,
  serverTimestamp,
  Firestore,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { Payroll, PayrollLineItem } from '@/types/payroll';
import { TimesheetBatch } from '@/types/timesheet';
import { Invoice } from '@/types/invoice';
import { UserProfile } from '@/types/user';
import { add, endOfMonth } from 'date-fns';

const VAT_RATE = 0.07;
const WHT_RATE = 0.03; // Default withholding tax rate

async function getNextInvoiceNumber(db: Firestore, transaction: any): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}${month}-`;
    
    const counterRef = doc(db, 'counters', 'invoiceNumbers');
    const counterSnap = await transaction.get(counterRef);

    let nextSeq = 1;
    if (counterSnap.exists()) {
        const data = counterSnap.data();
        if (data.currentMonth === `${year}${month}`) {
            nextSeq = data.seq + 1;
        }
        // If it's a new month, seq resets to 1.
    }
    
    transaction.set(counterRef, {
        currentMonth: `${year}${month}`,
        seq: nextSeq
    }, { merge: true });

    return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

export async function generateInvoiceFromBatch(
  db: Firestore,
  user: UserProfile,
  batchId: string
): Promise<{ invoiceId: string; invoiceNumber: string }> {

  const batchRef = doc(db, 'timesheetBatches', batchId);
  const payrollRef = doc(db, 'payrolls', batchId);
  const invoiceRef = doc(collection(db, 'invoices'));

  try {
    return await runTransaction(db, async (transaction) => {
        const batchSnap = await transaction.get(batchRef);
        if (!batchSnap.exists()) {
            throw new Error('Timesheet batch not found.');
        }
        const batch = batchSnap.data() as TimesheetBatch;

        const payrollSnap = await transaction.get(payrollRef);
        if (!payrollSnap.exists() || !payrollSnap.data().saleLineItems) {
            // TODO: In the future, calculate sale-side on the fly if payroll is missing.
            throw new Error('Payroll run with sale-side calculations not found for this batch. Please generate payroll first.');
        }
        const payroll = payrollSnap.data() as Payroll;

        const subtotal = payroll.saleLineItems.reduce((sum, item) => sum + item.totalPay, 0);
        const vatAmount = subtotal * VAT_RATE;
        const totalAmount = subtotal + vatAmount;
        const whtAmount = subtotal * WHT_RATE;
        const netReceivable = totalAmount - whtAmount;
        
        const issueDate = new Date();
        const dueDate = endOfMonth(add(issueDate, { days: 30 })); // Example: Due end of next month
        const invoiceNumber = await getNextInvoiceNumber(db, transaction);

        const newInvoice: Omit<Invoice, 'id'> = {
            clientId: batch.clientId,
            invoiceNumber,
            issueDate: Timestamp.fromDate(issueDate),
            dueDate: Timestamp.fromDate(dueDate),
            status: 'DRAFT',
            subtotal,
            vatAmount,
            totalAmount,
            whtAmount,
            netReceivable,
            // References
            batchId: batch.id,
            waveId: batch.waveId,
            projectId: batch.projectId,
            contractId: batch.contractId,
            cycleKey: batch.cycleKey,
        };

        transaction.set(invoiceRef, {
            ...newInvoice,
            createdAt: serverTimestamp(),
            createdBy: user.displayName || user.email,
        });

        return { invoiceId: invoiceRef.id, invoiceNumber };
    });
  } catch (error) {
    console.error('Failed to generate invoice:', error);
    throw error;
  }
}
