'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { CooldownPolicy } from '@/types/cooldown-policy';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, PlusCircle } from 'lucide-react';
import FullPageLoader from '@/components/full-page-loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { toDate } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';

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
  policyVersion: z.string().min(1, 'Policy version is required.'),
  effectiveFrom: dateSchema,
  note: z.string().optional(),
  matrix: z.object({
    onshore_to_onshore: z.coerce.number().int().min(0),
    onshore_to_offshore: z.coerce.number().int().min(0),
    offshore_to_onshore: z.coerce.number().int().min(0),
    offshore_to_offshore: z.coerce.number().int().min(0),
  }),
});

function NewPolicyDialog() {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      policyVersion: '',
      effectiveFrom: new Date(),
      note: '',
      matrix: {
        onshore_to_onshore: 7,
        onshore_to_offshore: 7,
        offshore_to_onshore: 14,
        offshore_to_offshore: 14,
      },
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db || !userProfile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'cooldownPolicies'), {
        ...values,
        effectiveFrom: Timestamp.fromDate(values.effectiveFrom),
        createdBy: userProfile.displayName || 'DEV',
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'New cooldown policy created.' });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating policy:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create policy.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="mr-2 h-4 w-4" /> Create New Policy</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Cooldown Policy</DialogTitle>
          <DialogDescription>
            This will create a new, immutable policy version. It will only apply to assignments created after its effective date.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="policyVersion" render={({ field }) => (
                <FormItem><FormLabel>Policy Version</FormLabel><FormControl><Input placeholder="e.g., v1.1-2024" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="effectiveFrom" render={({ field }) => (
                <FormItem><FormLabel>Effective From</FormLabel><FormControl><Input placeholder={DATE_FORMAT} {...field} value={field.value ? format(field.value, DATE_FORMAT) : ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <h4 className="font-medium pt-2">Cooldown Matrix (in days)</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="matrix.onshore_to_onshore" render={({ field }) => (
                <FormItem><FormLabel>Onshore to Onshore</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="matrix.onshore_to_offshore" render={({ field }) => (
                <FormItem><FormLabel>Onshore to Offshore</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="matrix.offshore_to_onshore" render={({ field }) => (
                <FormItem><FormLabel>Offshore to Onshore</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="matrix.offshore_to_offshore" render={({ field }) => (
                <FormItem><FormLabel>Offshore to Offshore</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Note</FormLabel><FormControl><Input placeholder="Reason for the new policy (optional)" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create Policy'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function CooldownPolicyPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  
  const policiesQuery = useMemoFirebase(() => db ? collection(db, 'cooldownPolicies') : null, [db]);
  const { data: policies, isLoading } = useCollection<CooldownPolicy>(policiesQuery);

  const isAdmin = userProfile?.role === 'admin';

  if (authLoading || isLoading) {
      return <FullPageLoader />;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to view or edit this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  const sortedPolicies = policies?.sort((a, b) => b.effectiveFrom.toMillis() - a.effectiveFrom.toMillis()) || [];
  const activePolicy = sortedPolicies.find(p => toDate(p.effectiveFrom) <= new Date());
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Cooldown Policy</h1>
        <NewPolicyDialog />
      </div>
      <p className="text-muted-foreground">
        Manage the mandatory rest days for employees after completing a work period. Policies are versioned and immutable.
      </p>

      {activePolicy && (
        <Card>
          <CardHeader>
            <CardTitle>Current Active Policy (Version: {activePolicy.policyVersion})</CardTitle>
            <CardDescription>Effective since {toDate(activePolicy.effectiveFrom)?.toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><p className="text-sm text-muted-foreground">Onshore to Onshore</p><p className="text-2xl font-bold">{activePolicy.matrix.onshore_to_onshore}</p></div>
                <div><p className="text-sm text-muted-foreground">Onshore to Offshore</p><p className="text-2xl font-bold">{activePolicy.matrix.onshore_to_offshore}</p></div>
                <div><p className="text-sm text-muted-foreground">Offshore to Onshore</p><p className="text-2xl font-bold">{activePolicy.matrix.offshore_to_onshore}</p></div>
                <div><p className="text-sm text-muted-foreground">Offshore to Offshore</p><p className="text-2xl font-bold">{activePolicy.matrix.offshore_to_offshore}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Policy History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Matrix (On-On / On-Off / Off-On / Off-Off)</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPolicies.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.policyVersion}</TableCell>
                  <TableCell>{toDate(p.effectiveFrom)?.toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono">
                    {p.matrix.onshore_to_onshore} / {p.matrix.onshore_to_offshore} / {p.matrix.offshore_to_onshore} / {p.matrix.offshore_to_offshore}
                  </TableCell>
                  <TableCell>{toDate(p.createdAt)?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
