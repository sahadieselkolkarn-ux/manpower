'use client';

import {
  doc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  Firestore,
  Timestamp,
} from 'firebase/firestore';
import { UserProfile } from '@/types/user';
import { BillAP, BillStatus } from '@/types/ap-bill';

interface BillInput {
  vendorName: string;
  billNo?: string;
  billDate: Date;
  dueDate?: Date;
  amount: number;
  currency?: string;
  category: string;
  note?: string;
}

export async function createBill(db: Firestore, user: UserProfile, data: BillInput) {
  const billData: Omit<BillAP, 'id'> = {
    ...data,
    billDate: Timestamp.fromDate(data.billDate),
    dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : undefined,
    status: 'DRAFT',
    paidAmount: 0,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    createdBy: user.displayName || user.email,
  };

  try {
    const docRef = await addDoc(collection(db, 'billsAP'), billData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating bill:', error);
    throw new Error('Failed to create bill.');
  }
}

export async function updateBill(db: Firestore, billId: string, currentStatus: BillStatus, data: Partial<BillInput>) {
  if (currentStatus === 'PAID' || currentStatus === 'VOID') {
    throw new Error(`Cannot edit a bill with status '${currentStatus}'.`);
  }
  
  const billRef = doc(db, 'billsAP', billId);
  const dataToUpdate: any = { ...data, updatedAt: serverTimestamp() };

  if (data.billDate) {
    dataToUpdate.billDate = Timestamp.fromDate(data.billDate);
  }
  if (data.dueDate) {
    dataToUpdate.dueDate = Timestamp.fromDate(data.dueDate);
  }

  try {
    await updateDoc(billRef, dataToUpdate);
  } catch (error) {
    console.error('Error updating bill:', error);
    throw new Error('Failed to update bill.');
  }
}
