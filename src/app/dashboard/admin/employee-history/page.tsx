'use client';

import React, { useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, History } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import FullPageLoader from '@/components/full-page-loader';
import { toDate } from '@/lib/utils';
import { Employee, WorkHistoryItem } from '@/types/employee';
import { useEffectOnce } from 'react-use';

interface FlatWorkHistory extends WorkHistoryItem {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
}

export default function EmployeeHistoryPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<FlatWorkHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isAdmin = userProfile?.role === 'admin';

  useEffectOnce(() => {
    if (!db || !isAdmin) {
      setIsLoading(false);
      return;
    };

    const fetchHistory = async () => {
      setIsLoading(true);
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const allHistory: FlatWorkHistory[] = [];
      employeesSnapshot.forEach(doc => {
        const employee = { id: doc.id, ...doc.data() } as Employee;
        if (employee.workHistory && employee.workHistory.length > 0) {
          employee.workHistory.forEach(item => {
            allHistory.push({
              ...item,
              employeeId: employee.id,
              employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
              employeeCode: employee.employeeCode,
            });
          });
        }
      });

      // Sort by end date, most recent first
      allHistory.sort((a, b) => {
        const dateA = a.actualEndDate ? toDate(a.actualEndDate)!.getTime() : 0;
        const dateB = b.actualEndDate ? toDate(b.actualEndDate)!.getTime() : 0;
        return dateB - dateA;
      });

      setHistory(allHistory);
      setIsLoading(false);
    };

    fetchHistory();
  });

  if (authLoading) {
    return <FullPageLoader />;
  }
  
  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to view this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <History />
            Employee Work History
          </h1>
          <p className="text-muted-foreground">A complete log of all employee assignments and work periods.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Wave ID</TableHead>
                <TableHead>Work Mode</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : history.length > 0 ? (
                history.map((item, index) => (
                    <TableRow key={`${item.employeeId}-${item.waveId}-${index}`}>
                        <TableCell>
                            <div className="font-medium">{item.employeeName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{item.employeeCode}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.waveId}</TableCell>
                        <TableCell>{item.workMode}</TableCell>
                        <TableCell>{toDate(item.actualStartDate)?.toLocaleDateString() || 'N/A'}</TableCell>
                        <TableCell>{toDate(item.actualEndDate)?.toLocaleDateString() || 'N/A'}</TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No work history found for any employee.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
