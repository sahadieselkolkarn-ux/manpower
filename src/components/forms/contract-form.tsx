
'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, doc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { type Client } from '@/types/client';
import { type ContractWithClient } from '@/types/contract';
import { ManpowerPosition } from '@/types/position';
import { Trash2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';

const saleRateSchema = z.object({
  positionId: z.string().min(1, "Position is required."),
  dailyRateExVat: z.coerce.number().optional(), // Legacy
  onshoreSellDailyRateExVat: z.coerce.number().min(0, "Rate must be non-negative.").optional(),
  offshoreSellDailyRateExVat: z.coerce.number().min(0, "Rate must be non-negative.").optional(),
});

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Contract name must be at least 2 characters.',
  }),
  clientId: z.string().min(1, { message: "Please select a client." }),
  saleRates: z.array(saleRateSchema).optional(),
  otRules: z.object({
    workdayMultiplier: z.coerce.number().min(0),
    weeklyHolidayMultiplier: z.coerce.number().min(0),
    contractHolidayMultiplier: z.coerce.number().min(0),
  }).optional(),
  changeNote: z.string().optional(),
});

interface ContractFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: ContractWithClient | null;
  clients: Client[];
  onSuccess?: () => void;
}

export default function ContractForm({ open, onOpenChange, contract, clients, onSuccess }: ContractFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const manpowerPositionsQuery = useMemoFirebase(() => (db ? collection(db, 'manpowerPositions') : null), [db]);
  const { data: positions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(manpowerPositionsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      clientId: '',
      saleRates: [],
      otRules: { workdayMultiplier: 1.5, weeklyHolidayMultiplier: 2, contractHolidayMultiplier: 3 },
      changeNote: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "saleRates",
  });
  
  const isSaleRatesDirty = form.formState.dirtyFields.saleRates;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
      return;
    }
    
    if (contract && isSaleRatesDirty && !values.changeNote) {
        form.setError("changeNote", { message: "A note is required when changing sale rates." });
        return;
    }

    setLoading(true);

    try {
      const { clientId, changeNote, ...contractData } = values;
      
      if (contract) {
        if (contract.isLocked) {
          throw new Error("Cannot update a locked contract.");
        }
        const contractRef = doc(db, 'clients', contract.clientId, 'contracts', contract.id);
        const updatePayload: any = {
            ...contractData,
            updatedAt: serverTimestamp(),
        };

        if (isSaleRatesDirty && changeNote) {
            updatePayload.pricingChangeLogs = arrayUnion({
                note: changeNote,
                by: userProfile.displayName || userProfile.email,
                at: serverTimestamp(),
            });
        }
        
        await updateDoc(contractRef, updatePayload);
        toast({ title: 'Success', description: 'Contract updated successfully.' });
      } else {
        const collectionRef = collection(db, 'clients', clientId, 'contracts');
        await addDoc(collectionRef, {
          ...contractData,
          status: 'active',
          isLocked: false,
          isDeleted: false,
          holidayCalendar: { timezone: 'Asia/Bangkok', dates: [] },
          createdBy: userProfile.displayName || userProfile.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Contract created successfully.' });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving contract:', error);
      const errorMessage = error instanceof Error ? error.message : 'There was a problem with your request. Please try again.';
      toast({ variant: 'destructive', title: 'Uh oh! Something went wrong.', description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: contract?.name || '',
        clientId: contract?.clientId || '',
        saleRates: contract?.saleRates || [],
        otRules: contract?.otRules || { workdayMultiplier: 1.5, weeklyHolidayMultiplier: 2, contractHolidayMultiplier: 3 },
        changeNote: '',
      });
    }
  }, [open, contract, form]);
  
  const isLocked = contract?.isLocked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{contract ? 'Edit Contract' : 'Add New Contract'}</DialogTitle>
          <DialogDescription>
            {isLocked ? "This contract is locked. Pricing and OT rules cannot be edited." : (contract ? "Update the contract's details below." : 'Enter the new contract details below.')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Contract Name</FormLabel><FormControl><Input placeholder="e.g. 2024 Maintenance Agreement" {...field} /></FormControl><FormMessage /></FormItem> )}/>
            <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem><FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!contract}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger></FormControl>
                    <SelectContent>{clients.map((client) => (<SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            
            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Sale Rates (Daily)</h3>
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-4 rounded-md relative">
                   <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)} disabled={isLocked}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  <FormField control={form.control} name={`saleRates.${index}.positionId`} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position (ลูกจ้าง)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLocked}>
                           <FormControl><SelectTrigger><SelectValue placeholder="Select manpower position..."/></SelectTrigger></FormControl>
                          <SelectContent>{isLoadingPositions ? <SelectItem value="loading" disabled>Loading...</SelectItem> : positions?.map(pos => <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name={`saleRates.${index}.onshoreSellDailyRateExVat`} render={({ field }) => (<FormItem><FormLabel>Onshore Sell Rate</FormLabel><FormControl><Input type="number" {...field} disabled={isLocked}/></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name={`saleRates.${index}.offshoreSellDailyRateExVat`} render={({ field }) => (<FormItem><FormLabel>Offshore Sell Rate</FormLabel><FormControl><Input type="number" {...field} disabled={isLocked}/></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                </div>
              ))}
               <Button type="button" variant="outline" size="sm" onClick={() => append({ positionId: "", onshoreSellDailyRateExVat: 0, offshoreSellDailyRateExVat: 0 })} disabled={isLocked}>Add Rate</Button>
            </div>
            
            <Separator />

            <div className="space-y-4">
                <h3 className="text-lg font-medium">OT Multipliers</h3>
                <div className="grid grid-cols-3 gap-4">
                     <FormField control={form.control} name="otRules.workdayMultiplier" render={({ field }) => ( <FormItem><FormLabel>Workday</FormLabel><FormControl><Input type="number" step="0.1" {...field} disabled={isLocked}/></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="otRules.weeklyHolidayMultiplier" render={({ field }) => ( <FormItem><FormLabel>Weekly Holiday</FormLabel><FormControl><Input type="number" step="0.1" {...field} disabled={isLocked}/></FormControl><FormMessage /></FormItem> )}/>
                     <FormField control={form.control} name="otRules.contractHolidayMultiplier" render={({ field }) => ( <FormItem><FormLabel>Contract Holiday</FormLabel><FormControl><Input type="number" step="0.1" {...field} disabled={isLocked}/></FormControl><FormMessage /></FormItem> )}/>
                </div>
            </div>

            {isSaleRatesDirty && contract && !isLocked && (
                <>
                <Separator />
                <FormField control={form.control} name="changeNote" render={({ field }) => ( <FormItem><FormLabel className="text-destructive">Reason for Change</FormLabel><FormControl><Textarea placeholder="Explain why the sale rates are being changed." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading || isLocked}>{loading ? 'Saving...' : 'Save Contract'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
