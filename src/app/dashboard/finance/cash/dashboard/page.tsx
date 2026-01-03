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
import { BankAccount } from '@/types/bank-account';
import { CashMovement } from '@/types/cash-movement';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BillAP } from '@/types/ap-bill';
import { Invoice } from '@/types/invoice';

export default function CashDashboardPage() {
  const db = useFirestore();

  // Fetch active bank accounts
  const activeAccountsQuery = useMemoFirebase(
    () =>
      db
        ? query(collection(db, 'bankAccounts'), where('active', '==', true))
        : null,
    [db]
  );
  const { data: accounts, isLoading: isLoadingAccounts } =
    useCollection<BankAccount>(activeAccountsQuery);

  // Fetch recent movements
  const recentMovementsQuery = useMemoFirebase(
    () =>
      db
        ? query(collection(db, 'cashMovements'), orderBy('date', 'desc'), limit(20))
        : null,
    [db]
  );
  const { data: movements, isLoading: isLoadingMovements } =
    useCollection<CashMovement>(recentMovementsQuery);

  // Fetch unpaid AP Bills for outflows
  const unpaidBillsQuery = useMemoFirebase(
    () =>
      db
        ? query(collection(db, 'billsAP'), where('status', '==', 'APPROVED'))
        : null,
    [db]
  );
  const { data: unpaidBills, isLoading: isLoadingBills } = useCollection<BillAP>(unpaidBillsQuery);
  
  // Fetch unpaid AR Invoices for inflows
  const unpaidInvoicesQuery = useMemoFirebase(
    () =>
      db
        ? query(collection(db, 'invoices'), where('status', 'in', ['SENT', 'PARTIAL', 'UNPAID']))
        : null,
    [db]
  );
  const { data: unpaidInvoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(unpaidInvoicesQuery);


  const isLoading = isLoadingAccounts || isLoadingMovements || isLoadingBills || isLoadingInvoices;
  
  const totalCash = accounts?.reduce((sum, acc) => sum + acc.openingBalance, 0) || 0; // Simplified for now
  const totalOutflows = unpaidBills?.reduce((sum, bill) => sum + (bill.amount - (bill.paidAmount || 0)), 0) || 0;
  const totalInflows = unpaidInvoices?.reduce((sum, inv) => sum + (inv.totalAmount - (inv.paidAmount || 0)), 0) || 0;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Cash Dashboard
        </h1>
      </div>
      <p className="text-muted-foreground">
        A real-time overview of your company's cash position.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cash Today</CardDescription>
            <CardTitle className="text-3xl font-mono">
              {isLoading ? <Skeleton className="h-8 w-48" /> : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCash)}
            </CardTitle>
          </CardHeader>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expected Inflows (AR)</CardDescription>
             <CardTitle className="text-3xl text-green-500 font-mono">
                {isLoading ? <Skeleton className="h-8 w-48" /> : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalInflows)}
             </CardTitle>
          </CardHeader>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expected Outflows (AP/Payroll)</CardDescription>
             <CardTitle className="text-3xl text-red-500 font-mono">
                 {isLoading ? <Skeleton className="h-8 w-48" /> : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalOutflows)}
             </CardTitle>
          </CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>Net Cash after Payroll</CardDescription>
                <CardTitle className="text-3xl font-mono">
                    {isLoading ? <Skeleton className="h-8 w-48" /> : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCash - totalOutflows)}
                </CardTitle>
            </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Balances</CardTitle>
            <CardDescription>
              Summary of balances across all active accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Current Balance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoadingAccounts ? (
                        Array.from({length: 3}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : accounts && accounts.length > 0 ? (
                        accounts.map(acc => (
                            <TableRow key={acc.id}>
                                <TableCell>
                                    <div className="font-medium">{acc.accountName}</div>
                                    <div className="text-xs text-muted-foreground">{acc.bankName} - {acc.accountNo}</div>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                     {new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency || 'USD' }).format(acc.openingBalance)}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={2} className="h-24 text-center">
                                No active accounts.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Movements</CardTitle>
            <CardDescription>
                The latest 20 financial transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoadingMovements ? (
                        Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : movements && movements.length > 0 ? (
                        movements.map(mov => (
                            <TableRow key={mov.id}>
                                <TableCell>{mov.date.toDate().toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Badge variant={mov.type === 'IN' ? 'default' : 'secondary'} className={mov.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                        {mov.type === 'IN' ? <ArrowUpCircle className="mr-1 h-3 w-3"/> : <ArrowDownCircle className="mr-1 h-3 w-3"/>}
                                        {mov.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(mov.amount)}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                No movements recorded yet.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
