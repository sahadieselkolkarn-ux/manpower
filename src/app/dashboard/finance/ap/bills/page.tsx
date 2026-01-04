'use client';

import { useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  doc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, CheckCircle, XCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BillAP } from '@/types/ap-bill';
import { getBillStatusVariant, formatDate } from '@/lib/utils';
import BillForm from '@/components/forms/bill-form';
import APPaymentForm from '@/components/forms/ap-payment-form';
import { BankAccount } from '@/types/bank-account';

export default function APBillsPage() {
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [isBillFormOpen, setIsBillFormOpen] = useState(false);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillAP | null>(null);
  const [billToVoid, setBillToVoid] = useState<BillAP | null>(null);

  const canManage = userProfile?.isAdmin || (userProfile?.roleIds || []).includes('FINANCE_MANAGER');

  const billsQuery = useMemoFirebase(() => db ? query(collection(db, 'billsAP'), orderBy('billDate', 'desc')) : null, [db]);
  const { data: bills, isLoading: isLoadingBills, refetch: refetchBills } = useCollection<BillAP>(billsQuery);

  const accountsQuery = useMemoFirebase(() => (db ? query(collection(db, 'bankAccounts'), where('active', '==', true)) : null), [db]);
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<BankAccount>(accountsQuery);

  const handleCreateBill = () => {
    setSelectedBill(null);
    setIsBillFormOpen(true);
  };

  const handleEditBill = (bill: BillAP) => {
    setSelectedBill(bill);
    setIsBillFormOpen(true);
  };

  const handleRecordPayment = (bill: BillAP) => {
    setSelectedBill(bill);
    setIsPaymentFormOpen(true);
  };

  const handleApproveBill = async (bill: BillAP) => {
    if (!db || bill.status !== 'DRAFT') return;
    const billRef = doc(db, 'billsAP', bill.id);
    const batch = writeBatch(db);
    batch.update(billRef, { status: 'APPROVED' });
    try {
      await batch.commit();
      toast({ title: 'Success', description: 'Bill approved successfully.' });
      refetchBills();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve bill.' });
    }
  };

  const handleVoidBill = async () => {
    if (!db || !billToVoid) return;
    const billRef = doc(db, 'billsAP', billToVoid.id);
    const batch = writeBatch(db);
    batch.update(billRef, { status: 'VOID' });
    try {
      await batch.commit();
      toast({ title: 'Success', description: 'Bill has been voided.' });
      refetchBills();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to void bill.' });
    } finally {
      setBillToVoid(null);
    }
  };

  const isLoading = isLoadingBills || isLoadingAccounts;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">A/P Bills</h1>
        {canManage && (
          <Button onClick={handleCreateBill}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Bill
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Manage non-payroll expenses and payments.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Bills & Expenses</CardTitle>
          <CardDescription>A list of all bills recorded in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Bill Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                    {canManage && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : bills && bills.length > 0 ? (
                bills.map((bill) => {
                  const balance = bill.amount - (bill.paidAmount || 0);
                  const canEdit = bill.status !== 'PAID' && bill.status !== 'VOID';
                  const canPay = bill.status === 'APPROVED' && balance > 0;
                  const canApprove = bill.status === 'DRAFT';

                  return (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.vendorName}</TableCell>
                      <TableCell><Badge variant="outline">{bill.category}</Badge></TableCell>
                      <TableCell>{formatDate(bill.billDate)}</TableCell>
                      <TableCell>{formatDate(bill.dueDate)}</TableCell>
                      <TableCell><Badge variant={getBillStatusVariant(bill.status)}>{bill.status}</Badge></TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: bill.currency || 'USD' }).format(balance)}
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
                              <DropdownMenuItem onClick={() => handleEditBill(bill)} disabled={!canEdit}>
                                Edit Bill
                              </DropdownMenuItem>
                              {canPay && (
                                <DropdownMenuItem onClick={() => handleRecordPayment(bill)}>
                                  Record Payment
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {canApprove && (
                                <DropdownMenuItem onClick={() => handleApproveBill(bill)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Approve Bill
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <DropdownMenuItem className="text-red-500" onClick={() => setBillToVoid(bill)}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Void Bill
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center">
                    No bills found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <>
          <BillForm
            open={isBillFormOpen}
            onOpenChange={setIsBillFormOpen}
            bill={selectedBill}
            onSuccess={refetchBills}
          />
          {selectedBill && accounts && (
            <APPaymentForm
              open={isPaymentFormOpen}
              onOpenChange={setIsPaymentFormOpen}
              bill={selectedBill}
              accounts={accounts}
              onSuccess={() => {
                setIsPaymentFormOpen(false);
                refetchBills();
              }}
            />
          )}
        </>
      )}
      
      {billToVoid && (
        <AlertDialog open={!!billToVoid} onOpenChange={() => setBillToVoid(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to void this bill?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. It will mark the bill for vendor '{billToVoid.vendorName}' as VOID.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleVoidBill} className="bg-destructive hover:bg-destructive/90">Void Bill</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
