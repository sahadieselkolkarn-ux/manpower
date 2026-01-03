
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
import { Invoice } from '@/types/invoice';
import { BankAccount } from '@/types/bank-account';
import { Textarea } from '../ui/textarea';
import { createARPayment } from '@/lib/firestore/ar-payment.service';
import { useFirestore } from '@/firebase';

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

const formSchema = z.object({
  paidAt: dateSchema,
  amount: z.coerce.number().min(0, 'Amount must be non-negative.'),
  whtAmount: z.coerce.number().min(0, 'WHT must be non-negative.').optional(),
  method: z.enum(['bank', 'cash', 'transfer']),
  bankAccountId: z.string().min(1, 'Please select the receiving account.'),
  reference: z.string().optional(),
  note: z.string().optional(),
  whtFileRef: z.string().optional(), // Placeholder for file upload
});

interface ARPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  accounts: BankAccount[];
  onSuccess?: () => void;
}

export default function ARPaymentForm({
  open,
  onOpenChange,
  invoice,
  accounts,
  onSuccess,
}: ARPaymentFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const balanceDue = invoice.netReceivable - (invoice.paidAmount || 0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        paidAt: new Date(),
        amount: balanceDue,
        whtAmount: invoice.whtAmount || 0,
        method: 'bank',
        bankAccountId: '',
        reference: '',
        note: `Payment for Invoice #${invoice.invoiceNumber}`,
        whtFileRef: '',
    },
  });

  React.useEffect(() => {
    if (open) {
        const remainingWht = (invoice.whtAmount || 0) - (invoice.whtReceivedAmount || 0);
        const remainingNet = invoice.netReceivable - (invoice.paidAmount || 0);

      form.reset({
        paidAt: new Date(),
        amount: Math.max(0, remainingNet),
        whtAmount: Math.max(0, remainingWht),
        method: 'bank',
        bankAccountId: '',
        reference: '',
        note: `Payment for Invoice #${invoice.invoiceNumber}`,
        whtFileRef: '',
      });
    }
  }, [open, invoice, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db) return;
    
    const totalPayment = (values.amount || 0) + (values.whtAmount || 0);
    const totalBalanceDue = (invoice.totalAmount || 0) - ((invoice.paidAmount || 0) + (invoice.whtReceivedAmount || 0));

    if (totalPayment > totalBalanceDue + 0.001) { // Add tolerance for floating point
        toast({
            variant: 'destructive',
            title: 'Overpayment Error',
            description: `Total payment (${totalPayment.toFixed(2)}) cannot exceed balance due of ${totalBalanceDue.toFixed(2)}.`,
          });
        return;
      }
    
    setLoading(true);

    try {
      await createARPayment(db, userProfile, {
        ...values,
        invoiceId: invoice.id,
        invoiceType: invoice.commercialItems ? 'commercial' : 'manpower',
      });

      toast({ title: 'Success', description: 'Payment recorded successfully.' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not record the payment.';
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment for Invoice #{invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Net Receivable: <span className="font-bold font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balanceDue)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField control={form.control} name="paidAt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input placeholder={DATE_FORMAT} {...field} value={field.value ? format(field.value, DATE_FORMAT) : ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cash Received</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="whtAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Withholding Tax</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
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
                <FormLabel>Deposit to Account</FormLabel>
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
             <FormField control={form.control} name="whtFileRef" render={({ field }) => (
                <FormItem>
                    <FormLabel>WHT Certificate (Optional)</FormLabel>
                    <FormControl><Input placeholder="File reference or URL" {...field} /></FormControl>
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
