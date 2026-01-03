
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { format, parse, isValid } from 'date-fns';
import { useRouter } from 'next/navigation';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import WaveSelector, { WaveSelectorData } from '@/components/selectors/wave-selector';
import { type Wave } from '@/types/wave';
import FullPageLoader from '@/components/full-page-loader';

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
  periodStart: dateSchema,
  periodEnd: dateSchema,
  templateVersion: z.string().min(1, 'Template version is required'),
}).refine(data => data.periodEnd >= data.periodStart, {
    message: "End date must be on or after start date.",
    path: ["periodEnd"],
});

export default function TimesheetIntakePage() {
  const [loading, setLoading] = React.useState(false);
  const [selectedWaveData, setSelectedWaveData] = useState<WaveSelectorData | null>(null);
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateVersion: 'v1.0',
    },
  });
  
  const handleWaveSelected = (wave: Wave & { id: string }, data: WaveSelectorData) => {
      setSelectedWaveData(data);
      form.setValue('periodStart', data.wave.planningWorkPeriod.startDate.toDate());
      form.setValue('periodEnd', data.wave.planningWorkPeriod.endDate.toDate());
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db || !selectedWaveData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a wave first.' });
        return;
    }
    setLoading(true);
    try {
      const newBatchRef = await addDoc(collection(db, 'timesheetBatches'), {
        clientId: selectedWaveData.routeParams.clientId,
        contractId: selectedWaveData.routeParams.contractId,
        projectId: selectedWaveData.routeParams.projectId,
        waveId: selectedWaveData.routeParams.waveId,
        periodStart: Timestamp.fromDate(values.periodStart),
        periodEnd: Timestamp.fromDate(values.periodEnd),
        templateVersion: values.templateVersion,
        status: 'DRAFT',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userProfile.displayName || 'DEV',
      });
      toast({ title: 'Success', description: 'New timesheet batch created. Redirecting...' });
      router.push(`/dashboard/hr/timesheets/${newBatchRef.id}`);
    } catch (error) {
      console.error('Error creating timesheet batch:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create batch.' });
    } finally {
      setLoading(false);
    }
  };

  const canManage = userProfile?.isAdmin || (userProfile?.roleIds || []).includes('HR_MANAGER');

  if (authLoading) {
    return <FullPageLoader />;
  }

  if (!canManage) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to access this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Timesheets
      </Button>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New Timesheet Intake</CardTitle>
          <CardDescription>
            Select a wave to create a new timesheet batch. The period will be pre-filled from the wave's planning dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormItem>
                <FormLabel>Wave</FormLabel>
                <WaveSelector onWaveSelected={handleWaveSelected} />
                <FormMessage />
              </FormItem>

              {selectedWaveData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="periodStart" render={({ field }) => (
                            <FormItem><FormLabel>Period Start Date</FormLabel><FormControl><Input placeholder={DATE_FORMAT} {...field} value={field.value ? format(field.value, DATE_FORMAT) : ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="periodEnd" render={({ field }) => (
                            <FormItem><FormLabel>Period End Date</FormLabel><FormControl><Input placeholder={DATE_FORMAT} {...field} value={field.value ? format(field.value, DATE_FORMAT) : ''} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    <FormField control={form.control} name="templateVersion" render={({ field }) => (
                        <FormItem><FormLabel>Template Version</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Batch'}</Button>
                    </div>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
