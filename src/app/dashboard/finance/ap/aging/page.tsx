'use client';

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
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { BillAP } from '@/types/ap-bill';
import { collection, query, where } from 'firebase/firestore';
import { differenceInDays, startOfDay } from 'date-fns';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function APAgingReportPage() {
  const db = useFirestore();

  const unpaidBillsQuery = useMemoFirebase(
    () =>
      db
        ? query(
            collection(db, 'billsAP'),
            where('status', 'in', ['DRAFT', 'APPROVED'])
          )
        : null,
    [db]
  );
  const { data: bills, isLoading } = useCollection<BillAP>(unpaidBillsQuery);

  const agingData = useMemo(() => {
    const buckets = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
      total: 0,
    };
    if (!bills) return buckets;

    const today = startOfDay(new Date());
    bills.forEach((bill) => {
      const balance = bill.amount - (bill.paidAmount || 0);
      const dueDate = bill.dueDate ? bill.dueDate.toDate() : bill.billDate.toDate();
      const daysOverdue = differenceInDays(today, dueDate);

      if (daysOverdue <= 30) buckets['0-30'] += balance;
      else if (daysOverdue <= 60) buckets['31-60'] += balance;
      else if (daysOverdue <= 90) buckets['61-90'] += balance;
      else buckets['90+'] += balance;
      
      buckets.total += balance;
    });

    return buckets;
  }, [bills]);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          A/P Aging Summary
        </h1>
      </div>
      <p className="text-muted-foreground">
        An overview of outstanding bills grouped by age from due date.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Aging Report</CardTitle>
          <CardDescription>
            This summary shows the total outstanding balance for all unpaid bills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aging Bucket</TableHead>
                <TableHead className="text-right">Outstanding Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({length: 4}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    </TableRow>
                ))
              ) : (
                <>
                  <TableRow>
                    <TableCell>Due in 0-30 days</TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(agingData['0-30'])}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Due in 31-60 days</TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(agingData['31-60'])}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Due in 61-90 days</TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(agingData['61-90'])}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Overdue 90+ days</TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(agingData['90+'])}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
           <div className="mt-4 text-right pr-4 font-bold">
            <p>Total Outstanding: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(agingData.total)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
