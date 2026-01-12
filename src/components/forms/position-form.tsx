
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
import { type OfficePosition, type ManpowerPosition } from '@/types/position';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '../ui/switch';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  description: z.string().optional(),
  active: z.boolean(),
});

type PositionVariant = OfficePosition | ManpowerPosition;

interface PositionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: PositionVariant | null;
  positionType: 'MANPOWER' | 'OFFICE';
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
      description: '',
      active: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (position) {
        form.reset({
          name: position.name || '',
          description: position.description || '',
          active: position.active !== undefined ? position.active : true,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          active: true,
        });
      }
    }
  }, [open, position, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db) return;
    setLoading(true);

    const collectionName = positionType === 'MANPOWER' ? 'manpowerPositions' : 'officePositions';
    const dataToSave: any = {
        ...values,
        updatedAt: serverTimestamp(),
    };
    
    try {
      if (position) {
        const posRef = doc(db, collectionName, position.id);
        await updateDoc(posRef, dataToSave);
        toast({ title: 'Success', description: 'Position updated.' });
      } else {
        await addDoc(collection(db, collectionName), {
          ...dataToSave,
          createdAt: serverTimestamp(),
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
          <DialogTitle>{position ? 'Edit' : 'Create'} {positionType === 'MANPOWER' ? 'Manpower Position' : 'Office Position'}</DialogTitle>
           <DialogDescription>
             {positionType === 'MANPOWER' 
                ? "Define the position name. Labor costs and sale prices are set per contract." 
                : 'Define the office position name.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Position Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
