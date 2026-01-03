'use client';

import {
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
  collection,
  Firestore,
  Timestamp
} from 'firebase/firestore';
import { UserProfile } from '@/types/user';
import { BillAP, BillStatus } from '@/types/ap-bill';
import { APPayment } from '@/types/ap-payment';

interface APPaymentInput {
  billId: string;
  paidAt: Date;
  amount: number;
  method: 'bank' | 'cash' | 'transfer';
  bankAccountId: string;
  reference?: string;
  note?: string;
}

export async function createBillPayment(
  db: Firestore,
  user: UserProfile,
  paymentData: APPaymentInput
) {
  const billRef = doc(db, 'billsAP', paymentData.billId);
  const paymentRef = doc(collection(db, 'paymentsAP'));
  const cashMovementRef = doc(collection(db, 'cashMovements'));

  const batch = writeBatch(db);

  try {
    const billSnap = await getDoc(billRef);
    if (!billSnap.exists()) {
      throw new Error('Bill not found.');
    }
    const bill = { id: billSnap.id, ...billSnap.data() } as BillAP;

    if (bill.status !== 'APPROVED') {
      throw new Error(`Cannot pay a bill with status '${bill.status}'. Must be 'APPROVED'.`);
    }

    const currentPaidAmount = bill.paidAmount || 0;
    const newPaidAmount = currentPaidAmount + paymentData.amount;
    const balanceDue = bill.amount - currentPaidAmount;

    if (paymentData.amount > balanceDue + 0.001) { // Floating point tolerance
      throw new Error(
        `Payment of ${paymentData.amount} exceeds balance due of ${balanceDue}.`
      );
    }

    let newStatus: BillStatus = 'APPROVED'; // or PARTIAL if you implement it
    if (newPaidAmount >= bill.amount) {
      newStatus = 'PAID';
    }

    // 1. Create PaymentAP document
    const newPayment: Omit<APPayment, 'id'> = {
      ...paymentData,
      paidAt: Timestamp.fromDate(paymentData.paidAt),
      createdAt: serverTimestamp() as Timestamp,
      createdBy: user.displayName || 'DEV',
    };
    batch.set(paymentRef, newPayment);

    // 2. Create CashMovement document
    batch.set(cashMovementRef, {
      date: Timestamp.fromDate(paymentData.paidAt),
      bankAccountId: paymentData.bankAccountId,
      type: 'OUT',
      amount: paymentData.amount,
      sourceType: 'AP',
      sourceId: bill.id,
      reference: paymentData.reference || `Payment for Bill #${bill.billNo || bill.id}`,
      createdAt: serverTimestamp(),
      createdBy: user.displayName || 'DEV',
    });

    // 3. Update Bill document
    batch.update(billRef, {
      paidAmount: newPaidAmount,
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
    return { paymentId: paymentRef.id, cashMovementId: cashMovementRef.id };
  } catch (error) {
    console.error('Error creating AP payment:', error);
    // Re-throw the error to be caught by the calling UI component
    throw error;
  }
}
