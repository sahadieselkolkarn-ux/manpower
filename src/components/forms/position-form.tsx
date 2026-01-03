'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Position, PositionType } from '@/types/position';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  type: z.custom<PositionType>(),
  costRateOnshore: z.coerce.number().min(0, "Cost must be non-negative.").optional(),
  costRateOffshore: z.coerce.number().min(0, "Cost must be non-negative.").optional(),
  description: z.string().optional(),
});

interface PositionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: Position | null;
  positionType: PositionType;
  onSuccess: () => void;
}

function PositionForm({ open, onOpenChange, position, positionType, onSuccess }: PositionFormProps) {
  const [loading, setLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: positionType,
      costRateOnshore: 0,
      costRateOffshore: 0,
      description: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      if (position) {
        form.reset({
          name: position.name || '',
          type: position.type || positionType,
          costRateOnshore: position.costRateOnshore || 0,
          costRateOffshore: position.costRateOffshore || 0,
          description: position.description || '',
        });
      } else {
        form.reset({
          name: '',
          type: positionType,
          costRateOnshore: 0,
          costRateOffshore: 0,
          description: '',
        });
      }
    }
  }, [open, position, form, positionType]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db) return;
    setLoading(true);

    const dataToSave = {
        ...values,
        // Ensure cost rates are 0 if it's an office position
        costRateOnshore: positionType === 'FIELD' ? values.costRateOnshore : 0,
        costRateOffshore: positionType === 'FIELD' ? values.costRateOffshore : 0,
    };

    try {
      if (position) {
        const posRef = doc(db, 'positions', position.id);
        await updateDoc(posRef, { ...dataToSave, updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Position updated.' });
      } else {
        await addDoc(collection(db, 'positions'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Position created.' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving position:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save position.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{position ? 'Edit' : 'Create'} {positionType === 'FIELD' ? 'Field' : 'Office'} Position</DialogTitle>
           <DialogDescription>
            {positionType === 'FIELD' ? 'Define the position and its associated daily labor costs.' : 'Define the office position name.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            {positionType === 'FIELD' && (
                <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="costRateOnshore" render={({ field }) => (
                    <FormItem><FormLabel>Onshore Cost / Day</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="costRateOffshore" render={({ field }) => (
                    <FormItem><FormLabel>Offshore Cost / Day</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                </div>
            )}

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default PositionForm;
