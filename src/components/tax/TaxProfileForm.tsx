
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Employee, Ly01Profile } from '@/types/employee';
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
import { Separator } from '../ui/separator';
import { Download } from 'lucide-react';
import { removeUndefineds } from '@/lib/firestore/utils';

interface TaxProfileFormProps {
  employee: Employee;
}

const formSchema = z.object({
  status: z.custom<Ly01Profile['status']>(),
  data: z.object({
    maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  }),
  verifiedBySelf: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export function TaxProfileForm({ employee }: TaxProfileFormProps) {
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const ly01Profile = employee.taxProfile?.ly01;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (ly01Profile) {
        form.reset({
            status: ly01Profile.status,
            data: {
                maritalStatus: ly01Profile.data?.maritalStatus,
            },
            verifiedBySelf: ly01Profile.verifiedBySelf || false,
        });
    }
  }, [ly01Profile, form]);


  const onSubmit = async (values: FormData) => {
    if (!db || !ly01Profile) return;
    setLoading(true);

    const isComplete = !!values.data.maritalStatus && values.verifiedBySelf;
    let newStatus: Ly01Profile['status'] = 'DRAFT';

    if(values.status === 'MISSING' && isComplete) {
        newStatus = 'SUBMITTED';
    } else if (values.status === 'DRAFT' && isComplete) {
        newStatus = 'SUBMITTED';
    } else if (values.status === 'SUBMITTED' || values.status === 'VERIFIED') {
        newStatus = values.status; // Don't downgrade status
    }

    const dataToSave = {
      taxProfile: {
          ly01: {
            ...ly01Profile, // Keep existing data
            status: newStatus,
            data: { // Merge new data
                ...ly01Profile.data,
                ...values.data,
            },
            verifiedBySelf: values.verifiedBySelf,
            verifiedAt: (values.verifiedBySelf && !ly01Profile.verifiedBySelf) ? serverTimestamp() : ly01Profile.verifiedAt,
            updatedAt: serverTimestamp(),
            updatedBy: userProfile?.displayName || 'System',
          }
      }
    };
    
    const cleanPayload = removeUndefineds(dataToSave);

    try {
      await updateDoc(doc(db, 'employees', employee.id), cleanPayload);
      toast({ title: 'Success', description: 'Tax profile has been saved.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save tax profile.' });
    } finally {
      setLoading(false);
    }
  };

  const status = ly01Profile?.status || 'MISSING';

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
                <Badge variant={status === 'VERIFIED' ? 'default' : 'outline'} className="text-lg">
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
                {/* Personal fields will be read-only from employee doc */}
                <p>Tax ID: {employee.taxProfile?.ly01?.data?.taxId || 'N/A'}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Tax Information</h3>
              <Separator className="my-2" />
               <div className="space-y-4">
                <FormField control={form.control} name="data.maritalStatus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marital Status</FormLabel>
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
