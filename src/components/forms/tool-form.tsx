
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Tool } from '@/types/tool';
import { Textarea } from '../ui/textarea';
import { allocateCode } from '@/lib/master-data/code-allocator';

const formSchema = z.object({
  name: z.string().min(2, 'Tool name is required.'),
  category: z.string().min(2, 'Category is required.'),
  unit: z.string().min(1, 'Unit is required.'),
  totalQuantity: z.coerce.number().int().min(0, 'Quantity cannot be negative.'),
  note: z.string().optional(),
});

interface ToolFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: Tool | null;
  onSuccess: () => void;
}

export default function ToolForm({ open, onOpenChange, tool, onSuccess }: ToolFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', category: '', unit: 'piece', totalQuantity: 0, note: '' },
  });

  React.useEffect(() => {
    if (open) {
      if (tool) {
        form.reset(tool);
      } else {
        form.reset({ name: '', category: '', unit: 'piece', totalQuantity: 0, note: '' });
      }
    }
  }, [open, tool, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db) return;
    setLoading(true);

    try {
      if (tool) {
        // Update logic
        const toolRef = doc(db, 'tools', tool.id);
        const currentTotal = tool.totalQuantity;
        const newTotal = values.totalQuantity;
        const assigned = tool.assignedQuantity;

        if (newTotal < assigned) {
          form.setError('totalQuantity', { message: `Cannot set total to less than the currently assigned quantity (${assigned}).` });
          setLoading(false);
          return;
        }
        
        await updateDoc(toolRef, {
          ...values,
          availableQuantity: newTotal - assigned,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Tool updated.' });

      } else {
        // Create logic
        await runTransaction(db, async (transaction) => {
          const { code } = await allocateCode(transaction, db, 'tools', 'TOOL');
          
          const newToolRef = doc(collection(db, 'tools'));
          transaction.set(newToolRef, {
            ...values,
            code,
            availableQuantity: values.totalQuantity,
            assignedQuantity: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        toast({ title: 'Success', description: 'New tool created.' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving tool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not save tool.';
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tool ? 'Edit Tool' : 'Add New Tool'}</DialogTitle>
          <DialogDescription>
            Manage the master record for a tool or piece of equipment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Tool Name</FormLabel><FormControl><Input placeholder="e.g., Safety Helmet" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Safety Gear, Power Tools" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="totalQuantity" render={({ field }) => (
                <FormItem><FormLabel>Total Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem><FormLabel>Unit</FormLabel><FormControl><Input placeholder="e.g., piece, set, box" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Note (Optional)</FormLabel><FormControl><Textarea placeholder="Specifications, storage location, etc." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Tool'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
