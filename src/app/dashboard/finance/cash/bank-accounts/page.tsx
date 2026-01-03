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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BankAccount } from '@/types/bank-account';
import BankAccountForm from '@/components/forms/bank-account-form';

export default function BankAccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null
  );

  const db = useFirestore();
  const { userProfile } = useAuth();

  const accountsQuery = useMemoFirebase(
    () => (db ? collection(db, 'bankAccounts') : null),
    [db]
  );
  const { data: accounts, isLoading } = useCollection<BankAccount>(accountsQuery);

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };
  
  const canManage = userProfile?.role === 'admin' || userProfile?.role === 'financeManager';


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Bank Accounts
        </h1>
        {canManage && (
          <Button onClick={handleAddAccount}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Account
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Manage all company bank accounts and cash-on-hand accounts.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Accounts List</CardTitle>
          <CardDescription>
            A list of all financial accounts registered in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24 ml-auto" />
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Skeleton className="h-5 w-8 ml-auto" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : accounts && accounts.length > 0 ? (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.accountName}</TableCell>
                    <TableCell>{account.bankName}</TableCell>
                    <TableCell>{account.accountNo}</TableCell>
                    <TableCell className="capitalize">{account.accountType}</TableCell>
                     <TableCell>
                      <Badge variant={account.active ? 'default' : 'secondary'}>
                        {account.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency || 'USD' }).format(account.openingBalance)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditAccount(account)}
                            >
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 7 : 6}
                    className="h-24 text-center"
                  >
                    No bank accounts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {canManage && (
        <BankAccountForm
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            account={selectedAccount}
        />
      )}
    </div>
  );
}
