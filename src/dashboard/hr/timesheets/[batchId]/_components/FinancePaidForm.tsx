
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';

import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TimesheetBatch } from '@/types/timesheet';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DATE_FORMAT, formatDate } from '@/lib/utils';
import { parse } from 'date-fns';

interface FinancePaidFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: TimesheetBatch;
  onSuccess: () => void;
}

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
  note: z.string().optional(),
});

export default function FinancePaidForm({ open, onOpenChange, batch, onSuccess }: FinancePaidFormProps) {
  const [loading, setLoading] = useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paidAt: new Date(),
      note: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db || !userProfile || !batch || batch.status !== 'HR_APPROVED') return;

    setLoading(true);
    try {
      const batchRef = doc(db, 'timesheetBatches', batch.id);
      await writeBatch(db)
        .update(batchRef, {
          status: 'FINANCE_PAID',
          paidAt: values.paidAt,
          paidBy: userProfile.displayName || userProfile.uid,
          updatedAt: serverTimestamp(),
        })
        .commit();

      toast({ title: 'Success', description: 'Batch marked as paid.' });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking batch as paid:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update batch status.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Batch as Paid</DialogTitle>
          <DialogDescription>
            This action signifies that all financial transactions for this batch have been completed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="paidAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={DATE_FORMAT}
                      {...field}
                      value={formatDate(field.value) || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Paid via transfer #12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
