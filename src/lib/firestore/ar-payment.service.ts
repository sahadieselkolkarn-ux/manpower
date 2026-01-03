
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
import { Invoice, InvoiceStatus } from '@/types/invoice';
import { ARPayment } from '@/types/ar-payment';

interface ARPaymentInput {
  invoiceId: string;
  invoiceType: 'manpower' | 'commercial';
  paidAt: Date;
  amount: number; // Net cash received
  whtAmount?: number;
  whtFileRef?: string;
  method: 'bank' | 'cash' | 'transfer';
  bankAccountId: string;
  reference?: string;
  note?: string;
}

export async function createARPayment(
  db: Firestore,
  user: UserProfile,
  paymentData: ARPaymentInput
) {
  const invoiceRef = doc(db, 'invoices', paymentData.invoiceId);
  const paymentRef = doc(collection(db, 'paymentsAR'));
  const cashMovementRef = doc(collection(db, 'cashMovements'));

  const batch = writeBatch(db);

  try {
    const invoiceSnap = await getDoc(invoiceRef);
    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found.');
    }
    const invoice = { id: invoiceSnap.id, ...invoiceSnap.data() } as Invoice;

    if (
      invoice.status !== 'SENT' &&
      invoice.status !== 'PARTIAL' &&
      invoice.status !== 'UNPAID'
    ) {
      throw new Error(
        `Invoice is not in a payable status. Current status: ${invoice.status}`
      );
    }

    const currentPaidAmount = invoice.paidAmount || 0;
    const currentWhtReceived = invoice.whtReceivedAmount || 0;
    const paymentWhtAmount = paymentData.whtAmount || 0;

    const newPaidAmount = currentPaidAmount + paymentData.amount;
    const newWhtReceived = currentWhtReceived + paymentWhtAmount;
    
    const totalReceived = newPaidAmount + newWhtReceived;

    if (totalReceived > invoice.totalAmount + 0.001) { // Add tolerance for floating point
      throw new Error(
        `Total received (${totalReceived}) cannot exceed invoice total amount of ${invoice.totalAmount}.`
      );
    }

    let newStatus: InvoiceStatus;
    if (totalReceived >= invoice.totalAmount) {
      newStatus = 'PAID';
    } else {
      newStatus = 'PARTIAL';
    }

    const newPayment: Omit<ARPayment, 'id'> = {
      ...paymentData,
      paidAt: Timestamp.fromDate(paymentData.paidAt),
      createdAt: serverTimestamp(),
      createdBy: user.displayName || 'DEV',
    };
    batch.set(paymentRef, newPayment);

    // Create cash movement only for the actual cash received
    if (paymentData.amount > 0) {
        batch.set(cashMovementRef, {
            date: Timestamp.fromDate(paymentData.paidAt),
            bankAccountId: paymentData.bankAccountId,
            type: 'IN',
            amount: paymentData.amount, // Only the cash amount
            sourceType: 'AR',
            sourceId: paymentData.invoiceId,
            reference:
                paymentData.reference || `Payment for Invoice #${invoice.invoiceNumber}`,
            createdAt: serverTimestamp(),
            createdBy: user.displayName || 'DEV',
        });
    }

    // Update Invoice document with both paid and WHT amounts
    batch.update(invoiceRef, {
      paidAmount: newPaidAmount,
      whtReceivedAmount: newWhtReceived,
      status: newStatus,
    });

    await batch.commit();
    return { paymentId: paymentRef.id, cashMovementId: cashMovementRef.id };
  } catch (error) {
    console.error('Error creating AR payment:', error);
    throw error;
  }
}
