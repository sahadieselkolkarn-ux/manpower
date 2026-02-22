'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CompanyProfile } from '@/types/company-profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import FullPageLoader from '@/components/full-page-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { toDate } from '@/lib/utils';
import { addDoc, collection } from 'firebase/firestore';

const formSchema = z.object({
  legalNameTH: z.string().min(1, 'Required'),
  legalNameEN: z.string().optional(),
  taxId: z.string().min(1, 'Required'),
  branchNo: z.string().optional(),
  addressLine1: z.string().min(1, 'Required'),
  addressLine2: z.string().optional(),
  district: z.string().optional(),
  province: z.string().min(1, 'Required'),
  postalCode: z.string().min(1, 'Required'),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email" }).optional().or(z.literal('')),
});

const getCompanyProfile = async (db: any): Promise<CompanyProfile | null> => {
  const docRef = doc(db, 'companyProfile', 'PRIMARY');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: 'PRIMARY', ...docSnap.data() } as CompanyProfile;
  }
  return null;
};

const upsertCompanyProfile = async (db: any, user: any, data: z.infer<typeof formSchema>) => {
    const docRef = doc(db, 'companyProfile', 'PRIMARY');
    const dataToSet = {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || 'DEV',
    };
    await setDoc(docRef, dataToSet, { merge: true });

    // Best-effort audit log
    try {
        await addDoc(collection(db, 'audit-logs'), {
            timestamp: serverTimestamp(),
            userId: user.uid,
            userName: user.displayName || 'DEV',
            action: 'update_company_profile',
            targetEntity: 'companyProfile',
            targetId: 'PRIMARY',
            afterState: data,
        });
    } catch (auditError) {
        console.error("Failed to write audit log:", auditError);
    }
};

export default function CompanyProfilePage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const originalData = React.useRef<z.infer<typeof formSchema> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      legalNameTH: '',
      legalNameEN: '',
      taxId: '',
      branchNo: '',
      addressLine1: '',
      addressLine2: '',
      district: '',
      province: '',
      postalCode: '',
      country: 'TH',
      phone: '',
      email: '',
    },
  });

  useEffect(() => {
    if (db) {
      getCompanyProfile(db).then((profile) => {
        if (profile) {
          form.reset(profile);
          originalData.current = profile;
        }
        setIsLoadingData(false);
      });
    }
  }, [db, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db || !userProfile) return;
    setIsSaving(true);
    try {
      await upsertCompanyProfile(db, userProfile, values);
      toast({ title: 'Success', description: 'Company profile updated.' });
      originalData.current = values;
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if(originalData.current) {
        form.reset(originalData.current);
    }
    setIsEditing(false);
  };
  
  if (authLoading || isLoadingData) {
      return <FullPageLoader />;
  }
  
  const lastUpdated = toDate(form.getValues('updatedAt' as any));
  const isAdmin = userProfile?.isAdmin;
  const isFormDisabled = !isEditing || isSaving;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Company Profile</h1>
          <p className="text-muted-foreground">Manage your company's legal identity for use in reports and documents.</p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>This information will appear on official documents like invoices and tax receipts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="legalNameTH" render={({ field }) => (
                  <FormItem><FormLabel>Company Name (TH)</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="legalNameEN" render={({ field }) => (
                  <FormItem><FormLabel>Company Name (EN)</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="taxId" render={({ field }) => (
                  <FormItem><FormLabel>Tax ID</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="branchNo" render={({ field }) => (
                  <FormItem><FormLabel>Branch No.</FormLabel><FormControl><Input placeholder="e.g., 00000 (สำนักงานใหญ่)" {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="addressLine1" render={({ field }) => (
                <FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="addressLine2" render={({ field }) => (
                <FormItem><FormLabel>Address Line 2</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="district" render={({ field }) => (
                  <FormItem><FormLabel>District / Area</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="province" render={({ field }) => (
                  <FormItem><FormLabel>Province</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="postalCode" render={({ field }) => (
                  <FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                )} />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} disabled={isFormDisabled} /></FormControl><FormMessage /></FormItem>
                    )} />
                 </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                 <div className="text-sm text-muted-foreground">
                    {lastUpdated && (
                        <p>Last updated: {lastUpdated.toLocaleString()}</p>
                    )}
                 </div>
                 {isAdmin && (
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </>
                        ) : (
                            <Button type="button" onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>
                        )}
                    </div>
                 )}
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
