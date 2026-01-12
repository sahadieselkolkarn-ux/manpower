
'use client';

import React, { use, useMemo, useCallback, useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import FullPageLoader from '@/components/full-page-loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ShieldAlert, Users, CheckCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { canManageFinance } from '@/lib/authz';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Payroll } from '@/types/payroll';
import { Employee } from '@/types/employee';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface PayrollLineWithEmployee extends Payroll['lineItems'][0] {
    employeeName?: string;
    employeeCode?: string;
}

export default function PayrollRunDetailsPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = use(params);
  const db = useFirestore();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const canAccess = canManageFinance(userProfile);
  const [linesWithNames, setLinesWithNames] = useState<PayrollLineWithEmployee[]>([]);
  const [isEmployeeDataLoading, setIsEmployeeDataLoading] = useState(true);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);


  const payrollRunRef = useMemoFirebase(
    () =>
      db
        ? (doc(db, 'payrolls', batchId) as DocumentReference<Payroll>)
        : null,
    [db, batchId]
  );
  const { data: payroll, isLoading: isLoadingPayroll, error, refetch } = useDoc<Payroll>(payrollRunRef);

  useEffect(() => {
    if (!payroll || !payroll.lineItems || !db) {
        if (!isLoadingPayroll) setIsEmployeeDataLoading(false);
        return;
    };
    
    const fetchEmployeeData = async () => {
        setIsEmployeeDataLoading(true);
        const employeeIds = [...new Set(payroll.lineItems.map(line => line.employeeId))];
        if (employeeIds.length === 0) {
            setLinesWithNames([]);
            setIsEmployeeDataLoading(false);
            return;
        }

        const employeesQuery = query(collection(db, 'employees'), where('__name__', 'in', employeeIds));
        const employeeSnaps = await getDocs(employeesQuery);
        const employeeMap = new Map(employeeSnaps.docs.map(doc => [doc.id, doc.data() as Employee]));

        const enrichedLines = payroll.lineItems.map(line => {
            const employee = employeeMap.get(line.employeeId);
            return {
                ...line,
                employeeName: employee ? `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}` : 'Unknown',
                employeeCode: employee?.employeeCode || 'N/A',
            };
        });
        setLinesWithNames(enrichedLines);
        setIsEmployeeDataLoading(false);
    };

    fetchEmployeeData();

  }, [payroll, db, isLoadingPayroll]);
  
  const downloadCSV = useCallback(() => {
    if (linesWithNames.length === 0) return;
    
    const headers = ['Employee Code', 'Employee Name', 'Normal Pay', 'OT Pay', 'Total Pay'];
    const rows = linesWithNames.map(s => [
        s.employeeCode,
        s.employeeName,
        s.normalPay,
        s.otPay,
        s.totalPay
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_run_${batchId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [linesWithNames, batchId]);

  const handleMarkAsPaid = async () => {
    if (!db || !userProfile || !payroll || payroll.status !== 'PENDING') return;
    setIsMarkingPaid(true);

    const payrollRef = doc(db, 'payrolls', batchId);
    const timesheetRef = doc(db, 'timesheetBatches', batchId);
    
    const batch = writeBatch(db);
    try {
        batch.update(payrollRef, {
            status: 'PAID',
            paidAt: serverTimestamp(),
            paidBy: userProfile.displayName || userProfile.email,
        });
        batch.update(timesheetRef, {
            status: 'FINANCE_PAID',
            paidAt: serverTimestamp(),
            paidBy: userProfile.displayName || userProfile.email,
        });
        
        await batch.commit();

        toast({ title: 'Success', description: 'Payroll run and timesheet batch marked as paid.' });
        refetch(); // Refetch payroll data to update UI

    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to mark payroll as paid.' });
    } finally {
        setIsMarkingPaid(false);
    }
  }

  const summary = useMemo(() => {
    if (!payroll) return { totalCost: 0, totalSale: 0, employees: 0 };
    return {
        totalCost: payroll.lineItems?.reduce((sum, item) => sum + item.totalPay, 0) ?? 0,
        totalSale: payroll.saleLineItems?.reduce((sum, item) => sum + item.totalPay, 0) ?? 0,
        employees: payroll.lineItems?.length ?? 0
    }
  }, [payroll]);

  const isLoading = authLoading || isLoadingPayroll || isEmployeeDataLoading;

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

  if (error || !payroll) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
          <CardContent><p>{error?.message || 'Payroll Run not found for this batch.'}</p></CardContent>
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
          <h1 className="text-3xl font-bold tracking-tight font-headline">Payroll Run</h1>
           <p className="text-muted-foreground">
            Costing & Sale Summary for Timesheet Batch: <span className="font-mono">{batchId}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant={payroll.status === 'PAID' ? 'default' : 'secondary'} className="text-lg">
                {payroll.status}
            </Badge>
            <Button onClick={downloadCSV} disabled={linesWithNames.length === 0} variant="outline">
                <Download className="mr-2 h-4 w-4"/>
                Export CSV
            </Button>
            {payroll.status === 'PENDING' && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="mr-2 h-4 w-4"/> Mark Payroll as Paid
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will mark the payroll as paid and update the original timesheet batch status. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleMarkAsPaid} disabled={isMarkingPaid}>
                                {isMarkingPaid ? 'Processing...' : 'Yes, Mark as Paid'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
      </div>
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost (Payroll)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {summary.totalCost.toLocaleString('en-US', { style: 'currency', currency: 'THB' })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total payroll cost for {summary.employees} employees
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sale (Billing)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
                {summary.totalSale.toLocaleString('en-US', { style: 'currency', currency: 'THB' })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total billable amount to client
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {(summary.totalSale - summary.totalCost).toLocaleString('en-US', { style: 'currency', currency: 'THB' })}
            </div>
             <p className="text-xs text-muted-foreground">
              {summary.totalSale > 0 ? `${((summary.totalSale - summary.totalCost) / summary.totalSale * 100).toFixed(2)}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Payroll Cost Breakdown</CardTitle>
            <CardDescription>A summary of total payroll cost per employee for this run.</CardDescription>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Normal Pay</TableHead>
                    <TableHead>OT Pay</TableHead>
                    <TableHead className="text-right font-bold">Total Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {linesWithNames.length > 0 ? (
                        linesWithNames.map(line => (
                            <TableRow key={line.employeeId}>
                                <TableCell>
                                    <div className="font-medium">{line.employeeName}</div>
                                    <div className="text-xs text-muted-foreground">{line.employeeCode}</div>
                                </TableCell>
                                <TableCell className="font-mono">{line.normalPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="font-mono">{line.otPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                                <TableCell className="text-right font-mono font-bold">{line.totalPay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">No payroll lines found for this run.</TableCell>
                         </TableRow>
                    )}
                </TableBody>
                <CardFooter className="font-bold text-right">
                    Total: {summary.totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </CardFooter>
             </Table>
        </CardContent>
      </Card>
    </div>
  );
}
