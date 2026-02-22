
'use client';
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
  Firestore,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { UserProfile } from '@/types/user';
import { Tool } from '@/types/tool';
import { Employee } from '@/types/employee';

// For checking out a tool to an employee
export async function checkoutTool(
  db: Firestore,
  user: UserProfile,
  tool: Tool,
  employee: Employee,
  quantity: number,
  notes?: string
) {
  return runTransaction(db, async (transaction) => {
    const toolRef = doc(db, 'tools', tool.id);
    const toolDoc = await transaction.get(toolRef);
    if (!toolDoc.exists()) {
      throw new Error('Tool not found.');
    }
    const currentToolData = toolDoc.data() as Tool;

    if (currentToolData.availableQuantity < quantity) {
      throw new Error('Insufficient stock available.');
    }

    const newAssignmentRef = doc(collection(db, 'toolAssignments'));
    transaction.set(newAssignmentRef, {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
      toolId: tool.id,
      toolCode: tool.code,
      toolName: tool.name,
      quantity,
      notes: notes || '',
      requisitionDate: serverTimestamp(),
      createdBy: user.displayName || user.email,
      createdAt: serverTimestamp(),
    });

    transaction.update(toolRef, {
      availableQuantity: currentToolData.availableQuantity - quantity,
      assignedQuantity: currentToolData.assignedQuantity + quantity,
      updatedAt: serverTimestamp(),
    });

    return newAssignmentRef.id;
  });
}

// For adding new stock to inventory
export async function addToolStock(
  db: Firestore,
  user: UserProfile,
  tool: Tool,
  quantity: number,
  reason: string
) {
  return runTransaction(db, async (transaction) => {
    const toolRef = doc(db, 'tools', tool.id);
    const toolDoc = await transaction.get(toolRef);
    if (!toolDoc.exists()) {
      throw new Error('Tool not found.');
    }
    const currentToolData = toolDoc.data() as Tool;

    // In a real app, we'd log this to a separate history collection for auditing
    // For now, we'll just update the main tool doc
    transaction.update(toolRef, {
      totalQuantity: currentToolData.totalQuantity + quantity,
      availableQuantity: currentToolData.availableQuantity + quantity,
      updatedAt: serverTimestamp(),
      lastStockUpdate: {
          type: 'ADD',
          quantity,
          reason,
          by: user.displayName || user.email,
          at: serverTimestamp()
      }
    });
  });
}

// For handling returns
export async function returnToolStock(
  db: Firestore,
  user: UserProfile,
  tool: Tool,
  quantity: number,
  reason: string
) {
   return runTransaction(db, async (transaction) => {
    const toolRef = doc(db, 'tools', tool.id);
    const toolDoc = await transaction.get(toolRef);
    if (!toolDoc.exists()) {
      throw new Error('Tool not found.');
    }
    const currentToolData = toolDoc.data() as Tool;
    
    // We increase available but decrease assigned. Total quantity remains the same.
    const newAssigned = Math.max(0, currentToolData.assignedQuantity - quantity);

    transaction.update(toolRef, {
      availableQuantity: currentToolData.availableQuantity + quantity,
      assignedQuantity: newAssigned,
      updatedAt: serverTimestamp(),
      lastStockUpdate: {
          type: 'RETURN',
          quantity,
          reason,
          by: user.displayName || user.email,
          at: serverTimestamp()
      }
    });
  });
}
