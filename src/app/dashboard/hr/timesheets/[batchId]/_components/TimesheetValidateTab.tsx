'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimesheetBatch, TimesheetLine } from '@/types/timesheet';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, getDoc, collectionGroup } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Employee } from '@/types/employee';
import { Assignment } from '@/types/assignment';
import { toDate } from '@/lib/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/project';


interface TimesheetValidateTabProps {
    batch: TimesheetBatch;
    onValidationComplete: () => void;
}

// Pure validation logic
async function validateTimesheetLines(db: any, batchData: TimesheetBatch): Promise<{ updates: { lineId: string, anomalies: string[] }[], error?: string }> {
    const linesQuery = query(collection(db, 'timesheetLines'), where('batchId', '==', batchData.id));
    const linesSnap = await getDocs(linesQuery);
    const lines = linesSnap.docs.map(d => ({ id: d.id, ...d.data() } as TimesheetLine));

    if (lines.length === 0) {
        return { updates: [], error: 'No lines to validate.' };
    }

    const employeeIds = [...new Set(lines.map(l => l.employeeId))];
    
    // Fetch project to know workMode
    const projectRef = doc(db, 'clients', batchData.clientId, 'contracts', batchData.contractId, 'projects', batchData.projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) {
        return { updates: [], error: `Project with ID ${batchData.projectId} not found.` };
    }
    const project = projectSnap.data() as Project;
    
    // Batch fetch employees and assignments
    const employees: Record<string, Employee> = {};
    const assignments: Record<string, Assignment[]> = {};
    
    // Firestore 'in' query has a limit of 30 items in array
    for (let i = 0; i < employeeIds.length; i += 30) {
        const chunk = employeeIds.slice(i, i + 30);
        
        const empQuery = query(collection(db, 'employees'), where('employeeCode', 'in', chunk));
        const empSnaps = await getDocs(empQuery);
        empSnaps.forEach(snap => {
            employees[snap.data().employeeCode] = { id: snap.id, ...snap.data() } as Employee;
        });
        
        const asgnQuery = query(collectionGroup(db, 'assignments'), where('employeeId', 'in', chunk));
        const asgnSnaps = await getDocs(asgnQuery);
        asgnSnaps.forEach(snap => {
            const asgn = { id: snap.id, ...snap.data() } as Assignment;
            if (!assignments[asgn.employeeId]) assignments[asgn.employeeId] = [];
            assignments[asgn.employeeId].push(asgn);
        });
    }

    const updates: { lineId: string, anomalies: string[] }[] = [];

    for (const line of lines) {
        const anomalies: string[] = [];
        const employee = employees[line.employeeId];

        // Validation for workType
        if (line.workType === 'LEAVE') {
            if (line.normalHours > 0 || line.otHours > 0) anomalies.push('LEAVE_HAS_HOURS');
        } else if (line.workType === 'STANDBY') {
            if (line.otHours > 0) anomalies.push('STANDBY_HAS_OT');
        } else if (line.workType === 'NORMAL') {
             if (project.workMode === 'Onshore' && line.normalHours > 8) {
                anomalies.push('ONSHORE_OVER_8H');
            } else if (project.workMode === 'Offshore' && line.normalHours > 12) {
                anomalies.push('OFFSHORE_OVER_12H');
            }
            if (line.otHours > 0 && line.normalHours === 0) {
                 anomalies.push('OT_WITHOUT_NORMAL_HOURS');
            }
        }
        
        // Existing validations
        if (!employee) {
            anomalies.push('EMPLOYEE_NOT_FOUND');
        } 
        
        updates.push({ lineId: line.id, anomalies });
    }

    return { updates };
}

export default function TimesheetValidateTab({ batch, onValidationComplete }: TimesheetValidateTabProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [validationResult, setValidationResult] = useState<{ total: number, withAnomalies: number, byType: Record<string, number> } | null>(null);
    const db = useFirestore();
    const { toast } = useToast();

    const handleRunValidation = async () => {
        if (!db) return;
        setIsLoading(true);
        setValidationResult(null);

        try {
            const { updates, error } = await validateTimesheetLines(db, batch);

            if (error) {
                toast({ variant: 'destructive', title: 'Validation Error', description: error });
                setIsLoading(false);
                return;
            }

            // Write anomalies to DB
            const firestoreBatch = writeBatch(db);
            const anomalySummary = { total: updates.length, withAnomalies: 0, byType: {} as Record<string, number> };

            updates.forEach(({ lineId, anomalies }) => {
                const lineRef = doc(db, 'timesheetLines', lineId);
                firestoreBatch.update(lineRef, { anomalies });
                if (anomalies.length > 0) {
                    anomalySummary.withAnomalies++;
                    anomalies.forEach(type => {
                        const simpleType = type.split(':')[0]; // Group CERT_EXPIRED:BOSIET as CERT_EXPIRED
                        anomalySummary.byType[simpleType] = (anomalySummary.byType[simpleType] || 0) + 1;
                    });
                }
            });

            const batchRef = doc(db, 'timesheetBatches', batch.id);
            firestoreBatch.update(batchRef, { status: 'VALIDATED', updatedAt: serverTimestamp() });
            
            await firestoreBatch.commit();
            setValidationResult(anomalySummary);
            toast({ title: 'Validation Complete', description: 'Anomalies have been updated on each line.' });
            onValidationComplete();

        } catch (err) {
            console.error(err);
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred during validation.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Validate Timesheet Data</CardTitle>
                <CardDescription>
                    Run system checks to find potential errors or compliance issues before final approval.
                    This process will write anomalies to the timesheet lines but will not block approval.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <Button onClick={handleRunValidation} disabled={isLoading}>
                    {isLoading ? 'Validating...' : 'Run Validation'}
                </Button>

                {validationResult && (
                    <div className="mt-6 text-left border p-4 rounded-md">
                        <h3 className="font-semibold text-lg mb-2 flex items-center">
                            {validationResult.withAnomalies > 0 ? 
                                <AlertCircle className="mr-2 h-5 w-5 text-destructive" /> : 
                                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                            }
                            Validation Result
                        </h3>
                        <p>Total Lines Processed: {validationResult.total}</p>
                        <p>Lines with Anomalies: {validationResult.withAnomalies}</p>
                        {validationResult.withAnomalies > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold">Anomalies by Type:</h4>
                                <div className="flex flex-wrap gap-2 mt-2">
                                {Object.entries(validationResult.byType).map(([type, count]) => (
                                    <Badge key={type} variant="destructive">{type}: {count}</Badge>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
