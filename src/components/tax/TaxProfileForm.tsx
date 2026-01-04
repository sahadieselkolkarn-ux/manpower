'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types/employee';
import { TaxProfile } from '@/types/tax';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '../ui/badge';
import { getPersonKey } from '@/lib/tax/utils';
import { Separator } from '../ui/separator';
import { Download } from 'lucide-react';

interface TaxProfileFormProps {
  employee: Employee;
  taxProfile: TaxProfile | null;
  personKey: string;
  onSuccess: () => void;
}

const formSchema = z.object({
  personal: z.object({
    taxId: z.string().min(1, 'Tax ID is required.'),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
  tax: z.object({
    taxpayerStatus: z.string().min(1, 'Taxpayer status is required.'),
  }),
  verifiedBySelf: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export function TaxProfileForm({ employee, taxProfile, personKey, onSuccess }: TaxProfileFormProps) {
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personal: {
        taxId: taxProfile?.personal.taxId || '',
        address: taxProfile?.personal.address || employee.personalInfo.address,
        phone: taxProfile?.personal.phone || employee.contactInfo.phone,
      },
      tax: {
        taxpayerStatus: taxProfile?.tax.taxpayerStatus || '',
      },
      verifiedBySelf: taxProfile?.verifiedBySelf || false,
    },
  });

  const onSubmit = async (values: FormData) => {
    if (!db) return;
    setLoading(true);

    const isComplete = !!values.personal.taxId && !!values.tax.taxpayerStatus && values.verifiedBySelf;
    let newStatus: TaxProfile['status'] = 'INCOMPLETE';
    if (isComplete) {
      newStatus = 'COMPLETE';
    } else if (taxProfile?.status === 'COMPLETE' && !isComplete) {
      newStatus = 'NEEDS_UPDATE';
    }

    const dataToSave: Omit<TaxProfile, 'id'> = {
      personKey,
      personType: employee.employeeType,
      personRefId: employee.id,
      status: newStatus,
      updatedAt: serverTimestamp() as Timestamp,
      updatedBy: userProfile?.displayName || 'System',
      verifiedBySelf: values.verifiedBySelf,
      personal: {
        fullName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
        ...values.personal,
      },
      tax: values.tax,
    };

    try {
      await setDoc(doc(db, 'taxProfiles', personKey), dataToSave, { merge: true });
      toast({ title: 'Success', description: 'Tax profile has been saved.' });
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save tax profile.' });
    } finally {
      setLoading(false);
    }
  };

  const status = taxProfile?.status || 'NOT_STARTED';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>แบบฟอร์มข้อมูลผู้มีเงินได้ (ล.ย.01)</CardTitle>
                <CardDescription>
                  Employee: {employee.personalInfo.firstName} {employee.personalInfo.lastName} ({employee.employeeCode})
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" type="button"><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
                <Badge variant={status === 'COMPLETE' ? 'default' : 'outline'} className="text-lg">
                  Status: {status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <h3 className="text-lg font-medium">Personal Information</h3>
              <Separator className="my-2" />
              <div className="space-y-4">
                <FormField control={form.control} name="personal.taxId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Tax Information</h3>
              <Separator className="my-2" />
               <div className="space-y-4">
                <FormField control={form.control} name="tax.taxpayerStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxpayer Status</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium">Verification</h3>
              <Separator className="my-2" />
               <FormField control={form.control} name="verifiedBySelf" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I confirm that the information provided is accurate and complete.
                    </FormLabel>
                  </div>
                </FormItem>
              )} />
            </div>

          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
