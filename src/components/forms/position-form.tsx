
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const certOptions = useMemo((): {label: string, value: string}[] => {
    if (!certificateTypes) return [];
    // Filter certificates based on the position type.
    // OFFICE positions can only have OFFICE or GENERAL certs.
    // MANPOWER positions can only have FIELD or GENERAL certs.
    return certificateTypes
      .filter(ct => {
        if (positionType === 'OFFICE') {
          return ct.type === 'OFFICE' || ct.type === 'GENERAL';
        }
        if (positionType === 'MANPOWER') {
          return ct.type === 'FIELD' || ct.type === 'GENERAL';
        }
        return false; // Should not happen
      })
      .map(ct => ({ label: ct.name, value: ct.id }));
  }, [certificateTypes, positionType]);
  
  const toolOptions = useMemo((): {label: string, value: string}[] => {
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
                  render={() => (
                    <FormItem>
                      <FormLabel>Required Certificates</FormLabel>
                        <ScrollArea className="h-40 rounded-md border">
                            <div className="p-4 space-y-2">
                                {isLoadingCertTypes ? <p>Loading...</p> : certOptions.map(option => (
                                    <FormField
                                        key={option.value}
                                        control={form.control}
                                        name="requiredCertificateIds"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(option.value)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                            ? field.onChange([...(field.value || []), option.value])
                                                            : field.onChange(field.value?.filter((value) => value !== option.value))
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">{option.label}</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="requiredToolIds"
                  render={() => (
                    <FormItem>
                      <FormLabel>Required Tools & Equipment</FormLabel>
                       <ScrollArea className="h-40 rounded-md border">
                            <div className="p-4 space-y-2">
                                {isLoadingTools ? <p>Loading...</p> : toolOptions.map(option => (
                                     <FormField
                                        key={option.value}
                                        control={form.control}
                                        name="requiredToolIds"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(option.value)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                            ? field.onChange([...(field.value || []), option.value])
                                                            : field.onChange(field.value?.filter((value) => value !== option.value))
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">{option.label}</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
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
