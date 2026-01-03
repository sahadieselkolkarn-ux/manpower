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
import { Invoice } from '@/types/invoice';
import { collection, query, where } from 'firebase/firestore';
import { differenceInDays, startOfDay } from 'date-fns';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


export default function ARAgingReportPage() {
  const db = useFirestore();

  const unpaidInvoicesQuery = useMemoFirebase(
    () =>
      db
        ? query(
            collection(db, 'invoices'),
            where('status', 'in', ['SENT', 'PARTIAL', 'UNPAID'])
          )
        : null,
    [db]
  );
  const { data: invoices, isLoading } = useCollection<Invoice>(unpaidInvoicesQuery);

  const agingData = useMemo(() => {
    const buckets = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
      total: 0,
    };
    if (!invoices) return buckets;

    const today = startOfDay(new Date());
    invoices.forEach((invoice) => {
      const balance = invoice.totalAmount - (invoice.paidAmount || 0);
      const dueDate = invoice.dueDate.toDate();
      const daysOverdue = differenceInDays(today, dueDate);
      
      if (daysOverdue <= 0) buckets['0-30'] += balance; // Current or not yet due
      else if (daysOverdue <= 30) buckets['0-30'] += balance; // Overdue by 1-30 days
      else if (daysOverdue <= 60) buckets['31-60'] += balance;
      else if (daysOverdue <= 90) buckets['61-90'] += balance;
      else buckets['90+'] += balance;

      buckets.total += balance;
    });

    return buckets;
  }, [invoices]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          A/R Aging Summary
        </h1>
      </div>
      <p className="text-muted-foreground">
        An overview of outstanding receivables grouped by age from due date.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Aging Report</CardTitle>
          <CardDescription>
            This summary shows the total outstanding balance for all unpaid and
            partially paid invoices.
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
                    <TableCell>Current (0-30 days)</TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(agingData['0-30'])}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Overdue 31-60 days</TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(agingData['31-60'])}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Overdue 61-90 days</TableCell>
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
