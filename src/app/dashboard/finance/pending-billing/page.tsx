
'use client';

import React from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { canManageFinance } from '@/lib/authz';
import { formatDate } from '@/lib/utils';
import { TimesheetBatch } from '@/types/timesheet';
import FullPageLoader from '@/components/full-page-loader';
import { ShieldAlert } from 'lucide-react';

export default function PendingBillingPage() {
  const db = useFirestore();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();

  const pendingBatchesQuery = useMemoFirebase(
    () =>
      db
        ? query(
            collection(db, 'timesheetBatches'),
            where('status', '==', 'HR_APPROVED'),
            orderBy('approvedAt', 'desc')
          )
        : null,
    [db]
  );

  const { data: batches, isLoading } = useCollection<TimesheetBatch>(
    pendingBatchesQuery
  );

  const canAccess = canManageFinance(userProfile);

  if (authLoading || (isLoading && !batches)) {
    return <FullPageLoader />;
  }

  if (!canAccess) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="m-4 text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <ShieldAlert className="text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Pending Payment & Billing
        </h1>
      </div>
      <p className="text-muted-foreground">
        Items that have been approved by HR and are ready for financial processing.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Ready for Processing</CardTitle>
          <CardDescription>
            The following timesheet batches are locked and can be processed for payroll or invoicing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wave ID</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Approved At</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-28" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : batches && batches.length > 0 ? (
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-xs">{batch.waveId}</TableCell>
                    <TableCell className="font-medium">
                      {formatDate(batch.periodStart)} - {formatDate(batch.periodEnd)}
                    </TableCell>
                    <TableCell>{formatDate(batch.approvedAt)}</TableCell>
                    <TableCell>{batch.approvedBy}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{batch.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/hr/timesheets/${batch.id}`)
                        }
                      >
                        Open Batch
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No batches are currently pending financial processing.
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
