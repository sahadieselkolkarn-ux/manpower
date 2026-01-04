'use client';

import { useState } from 'react';
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
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ARPayment } from '@/types/ar-payment';
import { BankAccount } from '@/types/bank-account';
import { formatDate } from '@/lib/utils';

export default function ARPaymentsPage() {
  const db = useFirestore();

  const paymentsQuery = useMemoFirebase(
    () => (db ? query(collection(db, 'paymentsAR'), orderBy('paidAt', 'desc')) : null),
    [db]
  );
  const { data: payments, isLoading: isLoadingPayments } = useCollection<ARPayment>(paymentsQuery);

  const accountsQuery = useMemoFirebase(
    () => (db ? collection(db, 'bankAccounts') : null),
    [db]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<BankAccount>(accountsQuery);

  const accountMap = new Map(accounts?.map(acc => [acc.id, acc.accountName]));
  const isLoading = isLoadingPayments || isLoadingAccounts;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Customer Payments (AR)
        </h1>
      </div>
      <p className="text-muted-foreground">
        A complete history of all payments received from customers.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            All recorded customer payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  </TableRow>
                ))
              ) : payments && payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paidAt)}</TableCell>
                    <TableCell className="font-medium">
                      {/* TODO: Link to invoice page */}
                      {payment.invoiceId}
                    </TableCell>
                    <TableCell className="font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payment.amount)}
                    </TableCell>
                    <TableCell className="capitalize">
                      <Badge variant="outline">{payment.method}</Badge>
                    </TableCell>
                    <TableCell>{accountMap.get(payment.bankAccountId) || 'N/A'}</TableCell>
                    <TableCell>{payment.reference}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No payments recorded yet.
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
