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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CashMovement } from '@/types/cash-movement';
import CashMovementForm from '@/components/forms/cash-movement-form';
import { BankAccount } from '@/types/bank-account';
import { formatDate } from '@/lib/utils';


export default function CashMovementsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const db = useFirestore();
  const { userProfile } = useAuth();

  const movementsQuery = useMemoFirebase(
    () => (db ? query(collection(db, 'cashMovements'), orderBy('date', 'desc')) : null),
    [db]
  );
  const { data: movements, isLoading } = useCollection<CashMovement>(movementsQuery);
  
  const accountsQuery = useMemoFirebase(
    () => (db ? query(collection(db, 'bankAccounts'), where('active', '==', true)) : null),
    [db]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<BankAccount>(accountsQuery);

  const accountMap = new Map(accounts?.map(acc => [acc.id, acc.accountName]));

  const canManage = userProfile?.isAdmin || (userProfile?.roleIds || []).includes('FINANCE_MANAGER');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Cash Movements
        </h1>
        {canManage && (
          <div className="flex gap-2">
            <Button onClick={() => setIsFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Movement
            </Button>
          </div>
        )}
      </div>
      <p className="text-muted-foreground">
        A complete ledger of all money in, out, and transfers.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Movements Ledger</CardTitle>
          <CardDescription>
            All financial transactions recorded in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isLoadingAccounts ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  </TableRow>
                ))
              ) : movements && movements.length > 0 ? (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDate(movement.date)}</TableCell>
                    <TableCell>{accountMap.get(movement.bankAccountId) || 'Unknown Account'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={movement.type === 'IN' ? 'default' : (movement.type === 'OUT' ? 'destructive' : 'secondary')}
                        className={movement.type === 'IN' ? 'bg-green-100 text-green-800' : movement.type === 'OUT' ? 'bg-red-100 text-red-800' : ''}
                      >
                          {movement.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(movement.amount)}
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline">{movement.sourceType}</Badge>
                    </TableCell>
                    <TableCell>{movement.reference}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No cash movements found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <CashMovementForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          accounts={accounts || []}
        />
      )}
    </div>
  );
}
