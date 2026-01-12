'use client';

import React, { use, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  doc,
  DocumentReference,
} from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import FullPageLoader from '@/components/full-page-loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ShieldAlert } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { canManageFinance } from '@/lib/authz';
import { TimesheetBatch, TimesheetLine } from '@/types/timesheet';
import { Assignment } from '@/types/assignment';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { groupBy, map } from 'lodash';

interface PayrollSummary {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  positionName: string;
  totalDays: number;
  totalNormalHours: number;
  totalOtHours: number;
  anomaliesCount: number;
}

export default function PayrollPreviewPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = use(params);
  const db = useFirestore();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const canAccess = canManageFinance(userProfile);

  const batchRef = useMemoFirebase(
    () =>
      db
        ? (doc(db, 'timesheetBatches', batchId) as DocumentReference<TimesheetBatch>)
        : null,
    [db, batchId]
  );
  const { data: batch, isLoading: isLoadingBatch } = useDoc<TimesheetBatch>(batchRef);

  const linesQuery = useMemoFirebase(
    () => (db ? query(collection(db, 'timesheetLines'), where('batchId', '==', batchId)) : null),
    [db, batchId]
  );
  const { data: lines, isLoading: isLoadingLines } = useCollection<TimesheetLine>(linesQuery);

  const assignmentIds = useMemo(() => Array.from(new Set(lines?.map(l => l.assignmentId))), [lines]);
  
  const { data: assignments, isLoading: isLoadingAssignments } = useCollection<Assignment>(
      useMemoFirebase(() => (db && assignmentIds.length > 0) ? query(collection(db, 'assignments'), where('__name__', 'in', assignmentIds)) : null, [db, assignmentIds])
  );

  const payrollSummary = useMemo((): PayrollSummary[] => {
    if (!lines || !assignments) return [];
    
    const assignmentMap = new Map(assignments.map(a => [a.id, a]));
    const groupedByEmployee = groupBy(lines, 'employeeId');

    return map(groupedByEmployee, (employeeLines, employeeId) => {
      const firstLine = employeeLines[0];
      const assignment = assignmentMap.get(firstLine.assignmentId);
      
      const summary = employeeLines.reduce(
        (acc, line) => {
          acc.totalNormalHours += line.normalHours || 0;
          acc.totalOtHours += line.otHours || 0;
          acc.anomaliesCount += (line.anomalies || []).length;
          return acc;
        },
        { totalNormalHours: 0, totalOtHours: 0, anomaliesCount: 0 }
      );
      
      return {
        employeeId,
        employeeName: assignment?.employeeName || 'Unknown Employee',
        employeeCode: assignment?.employeeCode || 'N/A',
        positionName: assignment?.positionName || 'N/A',
        totalDays: employeeLines.length,
        ...summary,
      };
    });
  }, [lines, assignments]);
  
  const downloadCSV = useCallback(() => {
    if (payrollSummary.length === 0) return;
    
    const headers = ['Employee Code', 'Employee Name', 'Position', 'Total Days', 'Total Normal Hours', 'Total OT Hours', 'Anomalies'];
    const rows = payrollSummary.map(s => [
        s.employeeCode,
        s.employeeName,
        s.positionName,
        s.totalDays,
        s.totalNormalHours,
        s.totalOtHours,
        s.anomaliesCount
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_summary_${batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [payrollSummary, batchId]);


  const isLoading = authLoading || isLoadingBatch || isLoadingLines || isLoadingAssignments;

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!canAccess) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to view this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
          <CardContent><p>Timesheet batch not found.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.push('/dashboard/finance/payroll')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll List
          </Button>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Payroll Preview</h1>
           <p className="text-muted-foreground">
            Summary for Timesheet Batch ID: <span className="font-mono">{batchId}</span>
          </p>
        </div>
        <Button onClick={downloadCSV} disabled={payrollSummary.length === 0}>
            <Download className="mr-2 h-4 w-4"/>
            Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Employee Hour Summary</CardTitle>
            <CardDescription>A summary of total hours per employee for this batch.</CardDescription>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Total Days</TableHead>
                    <TableHead>Total Normal Hr</TableHead>
                    <TableHead>Total OT Hr</TableHead>
                    <TableHead>Anomalies</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {payrollSummary.length > 0 ? (
                        payrollSummary.map(summary => (
                            <TableRow key={summary.employeeId}>
                                <TableCell>
                                    <div className="font-medium">{summary.employeeName}</div>
                                    <div className="text-xs text-muted-foreground">{summary.employeeCode}</div>
                                </TableCell>
                                <TableCell>{summary.positionName}</TableCell>
                                <TableCell>{summary.totalDays}</TableCell>
                                <TableCell>{summary.totalNormalHours}</TableCell>
                                <TableCell>{summary.totalOtHours}</TableCell>
                                <TableCell>
                                    {summary.anomaliesCount > 0 ? (
                                        <Badge variant="destructive">{summary.anomaliesCount}</Badge>
                                    ) : (
                                        <span>0</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">No timesheet lines found for this batch.</TableCell>
                         </TableRow>
                    )}
                </TableBody>
             </Table>
        </CardContent>
      </Card>
    </div>
  );
}
