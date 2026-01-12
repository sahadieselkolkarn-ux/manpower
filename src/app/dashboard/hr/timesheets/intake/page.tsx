
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, serverTimestamp, Timestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { format, parse, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
import { canManageHR } from '@/lib/authz';

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM");

const formSchema = z.object({
  cycleKey: monthSchema,
  templateVersion: z.string().min(1, 'Template version is required'),
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
      cycleKey: format(new Date(), 'yyyy-MM'),
      templateVersion: 'v1.0',
    },
  });
  
  const handleWaveSelected = (wave: Wave & { id: string }, data: WaveSelectorData) => {
      setSelectedWaveData(data);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db || !selectedWaveData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a wave first.' });
        return;
    }
    setLoading(true);

    try {
      // Check for existing batch
      const q = query(
        collection(db, 'timesheetBatches'),
        where('waveId', '==', selectedWaveData.wave.id),
        where('cycleKey', '==', values.cycleKey),
        limit(1)
      );
      const existingSnap = await getDocs(q);
      
      if (!existingSnap.empty) {
        const existingBatchId = existingSnap.docs[0].id;
        toast({
            variant: 'destructive',
            title: 'Batch Already Exists',
            description: `A batch for this wave and month already exists.`,
            action: (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/dashboard/hr/timesheets/${existingBatchId}`}>Open Batch</Link>
              </Button>
            ),
        });
        setLoading(false);
        return;
      }

      const cycleDate = parse(values.cycleKey, 'yyyy-MM', new Date());
      const periodStart = startOfMonth(cycleDate);
      const periodEnd = endOfMonth(cycleDate);

      const newBatchRef = await addDoc(collection(db, 'timesheetBatches'), {
        clientId: selectedWaveData.routeParams.clientId,
        contractId: selectedWaveData.routeParams.contractId,
        projectId: selectedWaveData.routeParams.projectId,
        waveId: selectedWaveData.routeParams.waveId,
        cycleKey: values.cycleKey,
        periodStart: Timestamp.fromDate(periodStart),
        periodEnd: Timestamp.fromDate(periodEnd),
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

  const canManage = canManageHR(userProfile);

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
            Select a wave and a cutoff month to create a new timesheet batch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormItem>
                <FormLabel>1. Select Wave</FormLabel>
                <WaveSelector onWaveSelected={handleWaveSelected} />
                <FormMessage />
              </FormItem>

              {selectedWaveData && (
                <>
                    <FormField control={form.control} name="cycleKey" render={({ field }) => (
                        <FormItem>
                          <FormLabel>2. Cutoff Month</FormLabel>
                          <FormControl><Input placeholder="YYYY-MM" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )} />
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
