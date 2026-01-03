'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { format, parse, isValid } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BankAccount } from '@/types/bank-account';
import { CashMovementSourceType, CashMovementType } from '@/types/cash-movement';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

const DATE_FORMAT = 'dd/MM/yyyy';

const dateSchema = z.preprocess((arg) => {
    if (typeof arg === 'string' && arg) {
      try {
        const parsedDate = parse(arg, DATE_FORMAT, new Date());
        if (isValid(parsedDate)) return parsedDate;
      } catch (e) { /* ignore */ }
    }
    return arg;
  }, z.date({ required_error: 'Date is required.' }));

const movementSchema = z.object({
    date: dateSchema,
    bankAccountId: z.string().min(1, 'Please select an account.'),
    type: z.custom<CashMovementType>(),
    amount: z.coerce.number().positive('Amount must be a positive number.'),
    sourceType: z.custom<CashMovementSourceType>(),
    reference: z.string().optional(),
    note: z.string().optional(),
});

const transferSchema = z.object({
    date: dateSchema,
    fromAccountId: z.string().min(1, 'Please select the source account.'),
    toAccountId: z.string().min(1, 'Please select the destination account.'),
    amount: z.coerce.number().positive('Amount must be a positive number.'),
    reference: z.string().optional(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
    message: "Source and destination accounts cannot be the same.",
    path: ['toAccountId'],
});


interface CashMovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BankAccount[];
  onSuccess?: () => void;
}

export default function CashMovementForm({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: CashMovementFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const movementForm = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
        date: new Date(),
        bankAccountId: '',
        type: 'IN',
        amount: 0,
        sourceType: 'MANUAL',
        reference: '',
        note: '',
    },
  });

  const transferForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
        date: new Date(),
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        reference: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      movementForm.reset({ date: new Date(), bankAccountId: '', type: 'IN', amount: 0, sourceType: 'MANUAL', reference: '', note: '' });
      transferForm.reset({ date: new Date(), fromAccountId: '', toAccountId: '', amount: 0, reference: '' });
    }
  }, [open, movementForm, transferForm]);

  const onMovementSubmit = async (values: z.infer<typeof movementSchema>) => {
    if (!userProfile || !db) return;
    setLoading(true);
    try {
        const dataToSave = {
            ...values,
            date: Timestamp.fromDate(values.date),
            createdBy: userProfile.displayName || 'DEV',
            createdAt: serverTimestamp(),
        }
        await addDoc(collection(db, 'cashMovements'), dataToSave);
        toast({ title: 'Success', description: 'Cash movement recorded successfully.' });
        onSuccess?.();
        onOpenChange(false);
    } catch (error) {
        console.error('Error creating movement:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not record movement.' });
    } finally {
        setLoading(false);
    }
  };

  const onTransferSubmit = async (values: z.infer<typeof transferSchema>) => {
      if (!userProfile || !db) return;
      setLoading(true);
      try {
        const batch = writeBatch(db);
        const transferGroupId = `transfer_${Date.now()}`;
        const timestampDate = Timestamp.fromDate(values.date);

        // Movement OUT
        const outDocRef = doc(collection(db, 'cashMovements'));
        batch.set(outDocRef, {
            date: timestampDate,
            bankAccountId: values.fromAccountId,
            type: 'OUT',
            amount: values.amount,
            sourceType: 'TRANSFER',
            reference: values.reference || `Transfer to ${accounts.find(a=>a.id === values.toAccountId)?.accountName}`,
            transferGroupId,
            createdBy: 'DEV',
            createdAt: serverTimestamp(),
        });
        
        // Movement IN
        const inDocRef = doc(collection(db, 'cashMovements'));
        batch.set(inDocRef, {
            date: timestampDate,
            bankAccountId: values.toAccountId,
            type: 'IN',
            amount: values.amount,
            sourceType: 'TRANSFER',
            reference: values.reference || `Transfer from ${accounts.find(a=>a.id === values.fromAccountId)?.accountName}`,
            transferGroupId,
            createdBy: 'DEV',
            createdAt: serverTimestamp(),
        });

        await batch.commit();
        toast({ title: 'Success', description: 'Transfer recorded successfully.' });
        onSuccess?.();
        onOpenChange(false);
    } catch (error) {
        console.error('Error creating transfer:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not record transfer.' });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Cash Movement</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="movement">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="movement">IN / OUT</TabsTrigger>
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
            </TabsList>
            <TabsContent value="movement">
                <Form {...movementForm}>
                    <form onSubmit={movementForm.handleSubmit(onMovementSubmit)} className="space-y-4 pt-4">
                        <FormField control={movementForm.control} name="date" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Date</FormLabel>
                                <FormControl>
                                    <Input placeholder={DATE_FORMAT} {...field} value={field.value ? format(field.value, DATE_FORMAT) : ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={movementForm.control} name="bankAccountId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Account</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger></FormControl>
                                    <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.accountName}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={movementForm.control} name="type" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="IN">IN (Money In)</SelectItem>
                                            <SelectItem value="OUT">OUT (Money Out)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={movementForm.control} name="amount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount</FormLabel>
                                    <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                         </div>
                        <FormField control={movementForm.control} name="sourceType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Source</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="MANUAL">Manual Adjustment</SelectItem>
                                        <SelectItem value="AR">AR (Customer Payment)</SelectItem>
                                        <SelectItem value="AP">AP (Bill Payment)</SelectItem>
                                        <SelectItem value="PAYROLL">Payroll</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={movementForm.control} name="reference" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reference</FormLabel>
                                <FormControl><Input placeholder="e.g., Invoice #, Bill #" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <DialogFooter className="pt-4">
                            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Movement'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </TabsContent>
            <TabsContent value="transfer">
                 <Form {...transferForm}>
                    <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-4 pt-4">
                        <FormField control={transferForm.control} name="date" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date</FormLabel>
                                    <FormControl>
                                        <Input placeholder={DATE_FORMAT} {...field} value={field.value ? format(field.value, DATE_FORMAT) : ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                        )}/>
                        <FormField control={transferForm.control} name="fromAccountId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>From Account</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select source account" /></SelectTrigger></FormControl>
                                    <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.accountName}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={transferForm.control} name="toAccountId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>To Account</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select destination account" /></SelectTrigger></FormControl>
                                    <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.accountName}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={transferForm.control} name="amount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={transferForm.control} name="reference" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reference (Optional)</FormLabel>
                                <FormControl><Input placeholder="e.g., Internal funding" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <DialogFooter className="pt-4">
                            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Transfer'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
