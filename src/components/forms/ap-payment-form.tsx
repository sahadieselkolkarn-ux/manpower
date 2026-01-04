
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BillAP } from '@/types/ap-bill';
import { BankAccount } from '@/types/bank-account';
import { Textarea } from '../ui/textarea';
import { createBillPayment } from '@/lib/firestore/ap-payment.service';
import { useFirestore } from '@/firebase';
import { DATE_FORMAT } from '@/lib/utils';

const dateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' && arg) {
    try {
      const parsedDate = parse(arg, DATE_FORMAT, new Date());
      if (isValid(parsedDate)) return parsedDate;
    } catch (e) { /* ignore */ }
  }
  return arg;
}, z.date({ required_error: 'Date is required.' }));

const formSchema = z.object({
  paidAt: dateSchema,
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
  method: z.enum(['bank', 'cash', 'transfer']),
  bankAccountId: z.string().min(1, 'Please select the paying account.'),
  reference: z.string().optional(),
  note: z.string().optional(),
});

interface APPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillAP;
  accounts: BankAccount[];
  onSuccess?: () => void;
}

export default function APPaymentForm({
  open,
  onOpenChange,
  bill,
  accounts,
  onSuccess,
}: APPaymentFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const balanceDue = bill.amount - (bill.paidAmount || 0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paidAt: new Date(),
      amount: balanceDue,
      method: 'bank',
      bankAccountId: '',
      reference: '',
      note: `Payment for Bill #${bill.billNo || bill.id}`,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        paidAt: new Date(),
        amount: bill.amount - (bill.paidAmount || 0),
        method: 'bank',
        bankAccountId: '',
        reference: '',
        note: `Payment for Bill #${bill.billNo || bill.id}`,
      });
    }
  }, [open, bill, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db) return;
    if (values.amount > balanceDue + 0.001) { // Floating point tolerance
      form.setError('amount', { message: 'Payment cannot exceed the balance due.' });
      return;
    }

    setLoading(true);

    try {
      await createBillPayment(db, userProfile, {
        ...values,
        billId: bill.id,
      });

      toast({ title: 'Success', description: 'Bill payment recorded successfully.' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating bill payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not record the payment.';
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment for Bill #{bill.billNo || bill.id}</DialogTitle>
          <DialogDescription>
            Balance Due: <span className="font-bold font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: bill.currency || 'USD' }).format(balanceDue)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="paidAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input placeholder={DATE_FORMAT} {...field} value={formatDate(field.value) || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid</FormLabel>
                  <FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="method" render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Internal Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name="bankAccountId" render={({ field }) => (
              <FormItem>
                <FormLabel>Pay From Account</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select an account..." /></SelectTrigger></FormControl>
                  <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.accountName} ({acc.currency})</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name="reference" render={({ field }) => (
                <FormItem>
                    <FormLabel>Reference (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Transaction ID" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Internal notes about this payment" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Record Payment'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
