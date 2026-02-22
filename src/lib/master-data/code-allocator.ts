
'use client';

import {
  doc,
  getDoc,
  setDoc,
  Transaction,
  Firestore,
} from 'firebase/firestore';

/**
 * Allocates a new, unique, sequential code for a given entity type within a Firestore transaction.
 *
 * This function is designed to be used inside a `runTransaction` block to ensure atomicity.
 * It reads a counter, increments it, formats a new code, checks for collisions (just in case),
 * and updates the necessary documents.
 *
 * @param transaction The Firestore transaction object provided by `runTransaction`.
 * @param db The Firestore instance.
 * @param entity The name of the collection (e.g., 'officePositions', 'tools').
 * @param prefix The prefix for the code (e.g., 'OP', 'TOOL').
 * @returns A promise that resolves with the newly allocated code and its sequence number.
 * @throws Throws an error if the generated code already exists, which should be caught by the transaction's retry mechanism.
 */
export async function allocateCode(
  transaction: Transaction,
  db: Firestore,
  entity: 'certificateTypes' | 'officePositions' | 'manpowerPositions' | 'tools',
  prefix: 'CT' | 'OP' | 'MP' | 'TOOL'
): Promise<{ code: string; seq: number }> {
  
  const counterRef = doc(db, 'counters', `${entity}Codes`);
  const counterDoc = await transaction.get(counterRef);

  const seq = counterDoc.data()?.next ?? 1;
  const newCode = `${prefix}-${String(seq).padStart(4, '0')}`;

  // Safety check: ensure the generated code doesn't already exist in the unique collection.
  // This is a safeguard; in a perfect transaction, this should never fail.
  const uniqueRef = doc(db, 'unique', `${entity}Code__${newCode}`);
  const uniqueDoc = await transaction.get(uniqueRef);
  if (uniqueDoc.exists()) {
    // This will cause the transaction to fail and retry, hopefully with a new sequence number.
    throw new Error(`Code collision detected for ${newCode}. Transaction will retry.`);
  }
  
  // The calling function is responsible for setting the uniqueDoc with the new entityId,
  // but we update the counter here.
  transaction.set(counterRef, { next: seq + 1 }, { merge: true });

  return { code: newCode, seq };
}
