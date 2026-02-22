
'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, doc, updateDoc, serverTimestamp, query } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type OfficePosition, type ManpowerPosition } from '@/types/position';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '../ui/separator';
import { CertificateType } from '@/types/certificate-type';
import { Tool } from '@/types/tool';
import { MultiSelect, OptionType } from '../ui/multi-select';

const formSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  description: z.string().optional(),
  requiredCertificateIds: z.array(z.string()).optional(),
  requiredToolIds: z.array(z.string()).optional(),
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

  const { data: certificateTypes, isLoading: isLoadingCertTypes } = useCollection<CertificateType>(useMemoFirebase(() => (db ? collection(db, 'certificateTypes') : null), [db]));
  const { data: tools, isLoading: isLoadingTools } = useCollection<Tool>(useMemoFirebase(() => (db ? collection(db, 'tools') : null), [db]));

  const certOptions = useMemo((): OptionType[] => {
    if (!certificateTypes) return [];
    return certificateTypes.map(ct => ({ label: ct.name, value: ct.id }));
  }, [certificateTypes]);
  
  const toolOptions = useMemo((): OptionType[] => {
    if (!tools) return [];
    return tools.map(t => ({ label: `${t.name} (${t.code})`, value: t.id }));
  }, [tools]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      requiredCertificateIds: [],
      requiredToolIds: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      if (position) {
        const manpowerPosition = position as ManpowerPosition;
        form.reset({
          name: position.name || '',
          description: position.description || '',
          requiredCertificateIds: manpowerPosition.requiredCertificateIds || [],
          requiredToolIds: manpowerPosition.requiredToolIds || [],
        });
      } else {
        form.reset({
          name: '',
          description: '',
          requiredCertificateIds: [],
          requiredToolIds: [],
        });
      }
    }
  }, [open, position, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db) return;
    setLoading(true);

    const collectionName = positionType === 'MANPOWER' ? 'manpowerPositions' : 'officePositions';
    
    // Only include manpower-specific fields for manpower positions
    const dataToSave: any = {
      name: values.name,
      description: values.description,
      updatedAt: serverTimestamp(),
    };
    
    if (positionType === 'MANPOWER') {
        dataToSave.requiredCertificateIds = values.requiredCertificateIds || [];
        dataToSave.requiredToolIds = values.requiredToolIds || [];
    }
    
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
             <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Position Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            {positionType === 'MANPOWER' && (
              <>
                <Separator />
                <h3 className="text-base font-medium">Requirements</h3>
                 <FormField
                  control={form.control}
                  name="requiredCertificateIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Certificates</FormLabel>
                      <MultiSelect
                        options={certOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select required certificates..."
                        disabled={isLoadingCertTypes}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="requiredToolIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Tools & Equipment</FormLabel>
                       <MultiSelect
                        options={toolOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select required tools..."
                        disabled={isLoadingTools}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
