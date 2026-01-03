'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, ShieldAlert } from 'lucide-react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TimesheetBatch } from '@/types/timesheet';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FullPageLoader from '@/components/full-page-loader';

export default function TimesheetsListPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const batchesQuery = useMemoFirebase(
    () => (db ? query(collection(db, 'timesheetBatches'), orderBy('periodStart', 'desc')) : null),
    [db]
  );
  const { data: batches, isLoading: isLoadingBatches } = useCollection<TimesheetBatch>(batchesQuery);

  const isLoading = authLoading || isLoadingBatches;

  // Corrected permission check
  const canManage = userProfile?.isAdmin || (userProfile?.roleIds || []).includes('HR_MANAGER');

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!canManage) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to access this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Timesheet Batches</h1>
            <p className="text-muted-foreground">
                Manage incoming timesheet data from clients through validation and approval.
            </p>
        </div>
        <Button onClick={() => router.push('/dashboard/hr/timesheets/intake')}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Intake Batch
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Batches</CardTitle>
          <CardDescription>
            List of all timesheet batches received and their current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Created By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingBatches ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : batches && batches.length > 0 ? (
                batches.map((batch) => (
                  <TableRow key={batch.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/hr/timesheets/${batch.id}`)}>
                    <TableCell className="font-medium">
                      {batch.periodStart.toDate().toLocaleDateString()} - {batch.periodEnd.toDate().toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{batch.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      {batch.createdAt.toDate().toLocaleString()}
                    </TableCell>
                    <TableCell>{batch.createdBy}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No timesheet batches found. Start by creating a new intake batch.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
