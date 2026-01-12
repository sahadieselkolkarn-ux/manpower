
// src/app/dashboard/hr/settings/overtime/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { canManageHrSettings } from '@/lib/authz';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';
import FullPageLoader from '@/components/full-page-loader';
import { type OvertimeSettings } from '@/lib/overtime/resolve-day-category';


const formSchema = z.object({
  weekend: z.object({
    saturday: z.boolean(),
    sunday: z.boolean(),
  }),
  onshore: z.object({
    normalHours: z.coerce.number().min(0, "Cannot be negative"),
    otDivisor: z.coerce.number().min(1, "Must be at least 1"),
  }),
  offshore: z.object({
    normalHours: z.coerce.number().min(0, "Cannot be negative"),
    otDivisor: z.coerce.number().min(1, "Must be at least 1"),
  }),
});

const defaultSettings: z.infer<typeof formSchema> = {
    weekend: { saturday: true, sunday: true },
    onshore: { normalHours: 8, otDivisor: 8 },
    offshore: { normalHours: 12, otDivisor: 14 },
};


export default function OvertimeSettingsPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'hrSettings', 'overtimeSettings') : null, [db]);
  const { data: settings, isLoading, refetch } = useDoc<OvertimeSettings>(settingsRef);
  
  const [docExists, setDocExists] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultSettings
  });

  useEffect(() => {
    if (!isLoading) {
      if (settings) {
        form.reset(settings);
        setDocExists(true);
      } else {
        form.reset(defaultSettings);
        setDocExists(false);
      }
    }
  }, [settings, isLoading, form]);
  

  const canManage = canManageHrSettings(userProfile);
  const isSubmitting = form.formState.isSubmitting;

  const handleCreateDefault = async () => {
    if (!db || !userProfile || !canManage) return;
    try {
        await setDoc(settingsRef!, { ...defaultSettings, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: userProfile.uid });
        toast({ title: "Success", description: "Default settings have been created." });
        refetch();
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Error", description: "Could not create default settings." });
    }
  };


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db || !userProfile || !canManage) return;
    try {
      await setDoc(settingsRef!, {
        ...values,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile.uid,
      }, { merge: true });

      toast({ title: 'Success', description: 'Overtime settings have been saved.' });
      form.reset(values); // To mark the form as not dirty
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save settings.' });
    }
  };
  
  if (authLoading || isLoading) {
    return <FullPageLoader />;
  }

  if (!canManage) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Overtime Settings</h1>
            <p className="text-muted-foreground">Company-wide OT calculation rules.</p>
            </div>
        </div>
        <Card className="max-w-2xl">
           <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/> Read-only Access</CardTitle>
                <CardDescription>You do not have permission to modify these settings. The values below are for informational purposes only.</CardDescription>
           </CardHeader>
           <CardContent>
                <Form {...form}>
                    <form className="space-y-6">
                        <WeekendSection control={form.control} disabled={true}/>
                        <Separator />
                        <OnshoreSection control={form.control} disabled={true}/>
                         <Separator />
                        <OffshoreSection control={form.control} disabled={true}/>
                    </form>
                </Form>
           </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!docExists) {
      return (
           <div className="flex flex-1 items-center justify-center">
            <Card className="m-4 text-center">
            <CardHeader>
                <CardTitle>Settings Not Found</CardTitle>
                <CardDescription>The overtime settings document does not exist.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleCreateDefault}>Create Default Settings</Button>
            </CardContent>
            </Card>
        </div>
      )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Overtime Settings</h1>
          <p className="text-muted-foreground">Manage company-wide OT calculation rules for payroll.</p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card className="max-w-2xl">
            <CardContent className="pt-6 space-y-6">
                <WeekendSection control={form.control} disabled={isSubmitting} />
                <Separator/>
                <OnshoreSection control={form.control} disabled={isSubmitting} />
                 <Separator/>
                <OffshoreSection control={form.control} disabled={isSubmitting} />
            </CardContent>
            <CardFooter>
                 <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                 </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}


function WeekendSection({control, disabled}: {control: any, disabled: boolean}) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Weekend Definition</h3>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="weekend.saturday" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 rounded-lg border p-3"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled}/></FormControl><FormLabel>Saturday is a weekend</FormLabel></FormItem>
                )}/>
                 <FormField control={control} name="weekend.sunday" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 rounded-lg border p-3"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} /></FormControl><FormLabel>Sunday is a weekend</FormLabel></FormItem>
                )}/>
             </div>
        </div>
    )
}

function OnshoreSection({control, disabled}: {control: any, disabled: boolean}) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Onshore Rules</h3>
             <div className="grid grid-cols-2 gap-4">
                 <FormField control={control} name="onshore.normalHours" render={({ field }) => (
                    <FormItem><FormLabel>Normal Hours / Day</FormLabel><FormControl><Input type="number" {...field} disabled={disabled}/></FormControl><FormMessage/></FormItem>
                 )}/>
                 <FormField control={control} name="onshore.otDivisor" render={({ field }) => (
                    <FormItem><FormLabel>OT Divisor (ตัวหาร OT)</FormLabel><FormControl><Input type="number" {...field} disabled={disabled}/></FormControl><FormMessage/></FormItem>
                 )}/>
            </div>
        </div>
    )
}
function OffshoreSection({control, disabled}: {control: any, disabled: boolean}) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Offshore Rules</h3>
             <div className="grid grid-cols-2 gap-4">
                 <FormField control={control} name="offshore.normalHours" render={({ field }) => (
                    <FormItem><FormLabel>Normal Hours / Day</FormLabel><FormControl><Input type="number" {...field} disabled={disabled}/></FormControl><FormMessage/></FormItem>
                 )}/>
                 <FormField control={control} name="offshore.otDivisor" render={({ field }) => (
                    <FormItem><FormLabel>OT Divisor (ตัวหาร OT)</FormLabel><FormControl><Input type="number" {...field} disabled={disabled}/></FormControl><FormMessage/></FormItem>
                 )}/>
            </div>
        </div>
    )
}
