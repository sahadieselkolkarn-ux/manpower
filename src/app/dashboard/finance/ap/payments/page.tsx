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
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { APPayment } from '@/types/ap-payment';
import { BankAccount } from '@/types/bank-account';
import { BillAP } from '@/types/ap-bill';
import { useEffect, useState } from 'react';

export default function APPaymentsPage() {
  const db = useFirestore();
  const [billMap, setBillMap] = useState<Map<string, BillAP>>(new Map());
  const [isLoadingBills, setIsLoadingBills] = useState(true);

  const paymentsQuery = useMemoFirebase(
    () => (db ? query(collection(db, 'paymentsAP'), orderBy('paidAt', 'desc')) : null),
    [db]
  );
  const { data: payments, isLoading: isLoadingPayments } = useCollection<APPayment>(paymentsQuery);

  const accountsQuery = useMemoFirebase(
    () => (db ? collection(db, 'bankAccounts') : null),
    [db]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<BankAccount>(accountsQuery);
  const accountMap = new Map(accounts?.map(acc => [acc.id, acc.accountName]));

  useEffect(() => {
    const fetchBills = async () => {
      if (!db || !payments || payments.length === 0) {
        setIsLoadingBills(false);
        return;
      }
      setIsLoadingBills(true);
      const billIds = [...new Set(payments.map(p => p.billId))];
      if (billIds.length > 0) {
        const billsRef = collection(db, 'billsAP');
        const billsQuery = query(billsRef, where('__name__', 'in', billIds));
        const billSnaps = await getDocs(billsQuery);
        const fetchedBillMap = new Map(billSnaps.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as BillAP]));
        setBillMap(fetchedBillMap);
      }
      setIsLoadingBills(false);
    };

    fetchBills();
  }, [db, payments]);

  const isLoading = isLoadingPayments || isLoadingAccounts || isLoadingBills;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Bill Payments (AP)
        </h1>
      </div>
      <p className="text-muted-foreground">
        A complete history of all payments made for bills and expenses.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All recorded bill payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Bill No.</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid From</TableHead>
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
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  </TableRow>
                ))
              ) : payments && payments.length > 0 ? (
                payments.map((payment) => {
                  const bill = billMap.get(payment.billId);
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.paidAt.toDate().toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{bill?.vendorName || 'N/A'}</TableCell>
                      <TableCell>{bill?.billNo || 'N/A'}</TableCell>
                      <TableCell className="font-mono">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{accountMap.get(payment.bankAccountId) || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{payment.reference}</TableCell>
                    </TableRow>
                  )
                })
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
