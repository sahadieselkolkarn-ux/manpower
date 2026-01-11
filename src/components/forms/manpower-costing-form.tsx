// This is a new file: src/components/forms/manpower-costing-form.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  doc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  DocumentReference,
} from 'firebase/firestore';
import { parse, isValid } from 'date-fns';

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
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DATE_FORMAT, formatDate } from '@/lib/utils';
import { Textarea } from '../ui/textarea';

const dateSchema = z.string().refine(
  (val) => isValid(parse(val, DATE_FORMAT, new Date())),
  { message: `Date is required and must be in ${DATE_FORMAT} format.` }
);

const formSchema = z.object({
  onshoreLaborCostDaily: z.coerce.number().min(0, 'Cost must be non-negative'),
  offshoreLaborCostDaily: z.coerce.number().min(0, 'Cost must be non-negative'),
  effectiveFrom: dateSchema,
  note: z.string(), // To be made required dynamically
});

interface CostingRowData {
  positionId: string;
  positionName: string;
  onshoreCost?: number;
  offshoreCost?: number;
}

interface ManpowerCostingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractRef: DocumentReference;
  positionData: CostingRowData;
  onSuccess: () => void;
}

export default function ManpowerCostingForm({
  open,
  onOpenChange,
  contractRef,
  positionData,
  onSuccess,
}: ManpowerCostingFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      onshoreLaborCostDaily: positionData.onshoreCost ?? 0,
      offshoreLaborCostDaily: positionData.offshoreCost ?? 0,
      effectiveFrom: formatDate(new Date()),
      note: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        onshoreLaborCostDaily: positionData.onshoreCost ?? 0,
        offshoreLaborCostDaily: positionData.offshoreCost ?? 0,
        effectiveFrom: formatDate(new Date()),
        note: '',
      });
    }
  }, [open, positionData, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const originalCosting = {
        onshoreLaborCostDaily: positionData.onshoreCost ?? 0,
        offshoreLaborCostDaily: positionData.offshoreCost ?? 0,
    };
    
    const hasChanged =
      originalCosting.onshoreLaborCostDaily !== values.onshoreLaborCostDaily ||
      originalCosting.offshoreLaborCostDaily !== values.offshoreLaborCostDaily;

    if (hasChanged && !values.note) {
      form.setError('note', { message: 'A note is required when changing costs.' });
      return;
    }

    if (!userProfile || !db) return;
    setLoading(true);

    const costingDocRef = doc(contractRef, 'manpowerCosting', positionData.positionId);
    const historyDocRef = doc(collection(contractRef, 'manpowerCostingHistory'));
    const effectiveFromDate = parse(values.effectiveFrom, DATE_FORMAT, new Date());
    
    const batch = writeBatch(db);

    // 1. Set/Update the costing document
    batch.set(
      costingDocRef,
      {
        positionId: positionData.positionId,
        onshoreLaborCostDaily: values.onshoreLaborCostDaily,
        offshoreLaborCostDaily: values.offshoreLaborCostDaily,
        effectiveFrom: Timestamp.fromDate(effectiveFromDate),
        note: values.note,
        updatedAt: serverTimestamp(),
        updatedByUid: userProfile.uid,
        updatedByName: userProfile.displayName || userProfile.email,
      },
      { merge: true }
    );

    // 2. Create a history log if values changed
    if (hasChanged) {
        batch.set(historyDocRef, {
            positionId: positionData.positionId,
            before: originalCosting,
            after: {
                onshoreLaborCostDaily: values.onshoreLaborCostDaily,
                offshoreLaborCostDaily: values.offshoreLaborCostDaily,
            },
            effectiveFrom: Timestamp.fromDate(effectiveFromDate),
            note: values.note,
            changedAt: serverTimestamp(),
            changedByUid: userProfile.uid,
            changedByName: userProfile.displayName || userProfile.email,
        });
    }

    try {
      await batch.commit();
      toast({ title: 'Success', description: 'Manpower cost updated.' });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving manpower cost:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save data.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Cost for: {positionData.positionName}</DialogTitle>
          <DialogDescription>
            Enter the daily labor cost for this position.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="onshoreLaborCostDaily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Onshore Labor Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="offshoreLaborCostDaily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offshore Labor Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="effectiveFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective From</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Note for Change</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for this cost update..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Cost'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
