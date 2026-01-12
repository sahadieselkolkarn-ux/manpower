
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  doc,
  serverTimestamp,
  DocumentReference,
  updateDoc,
} from 'firebase/firestore';

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
import { ContractOtRules, ContractDayPayRules } from '@/types/contract';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  payrollOtRules: z.object({
    workdayMultiplier: z.coerce.number().min(0, "Must be non-negative"),
    weeklyHolidayMultiplier: z.coerce.number().min(0, "Must be non-negative"),
    contractHolidayMultiplier: z.coerce.number().min(0, "Must be non-negative"),
  }),
  payrollDayRules: z.object({
    weeklyHolidayDayMultiplier: z.coerce.number().min(0, "Must be non-negative"),
    contractHolidayDayMultiplier: z.coerce.number().min(0, "Must be non-negative"),
  })
});

interface PayrollOtRulesFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractRef: DocumentReference;
  currentOtRules?: ContractOtRules;
  currentDayRules?: ContractDayPayRules;
  onSuccess: () => void;
}

export default function PayrollOtRulesForm({
  open,
  onOpenChange,
  contractRef,
  currentOtRules,
  currentDayRules,
  onSuccess,
}: PayrollOtRulesFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const defaultValues = {
    payrollOtRules: currentOtRules ?? {
      workdayMultiplier: 1.5,
      weeklyHolidayMultiplier: 2,
      contractHolidayMultiplier: 3,
    },
    payrollDayRules: currentDayRules ?? {
      weeklyHolidayDayMultiplier: 1,
      contractHolidayDayMultiplier: 1,
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, currentOtRules, currentDayRules, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db) return;
    setLoading(true);

    try {
      await updateDoc(contractRef, {
        payrollOtRules: values.payrollOtRules,
        payrollDayRules: values.payrollDayRules,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Payroll OT & Day Pay Rules updated.' });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving payroll OT rules:', error);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Payroll OT & Day Pay Rules</DialogTitle>
          <DialogDescription>
            These multipliers are used for calculating employee pay (cost-side).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="space-y-2">
                <h4 className="font-medium text-sm">Daily Pay Multipliers (Full Day)</h4>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="payrollDayRules.weeklyHolidayDayMultiplier" render={({ field }) => (
                        <FormItem><FormLabel>Weekend</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="payrollDayRules.contractHolidayDayMultiplier" render={({ field }) => (
                        <FormItem><FormLabel>Holiday</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            </div>
            <Separator />
            <div className="space-y-2">
                 <h4 className="font-medium text-sm">Hourly OT Multipliers</h4>
                <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="payrollOtRules.workdayMultiplier" render={({ field }) => (
                        <FormItem><FormLabel>Workday OT</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="payrollOtRules.weeklyHolidayMultiplier" render={({ field }) => (
                        <FormItem><FormLabel>Weekend OT</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="payrollOtRules.contractHolidayMultiplier" render={({ field }) => (
                        <FormItem><FormLabel>Holiday OT</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            </div>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Rules'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
