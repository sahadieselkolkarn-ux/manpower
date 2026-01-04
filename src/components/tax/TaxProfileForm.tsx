

'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Download } from 'lucide-react';
import { removeUndefineds } from '@/lib/firestore/utils';
import { ly01FormSchema, Ly01FormData } from '@/types/ly01.schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toDate, formatDate } from '@/lib/utils';
import { Textarea } from '../ui/textarea';
import { merge } from 'lodash';
import { useRouter } from 'next/navigation';


interface TaxProfileFormProps {
  employee: Employee;
}

const defaultLy01Data: Ly01FormData = {
  data: {
    personal: {
      taxId: '',
      address: {
        building: '',
        roomNo: '',
        floor: '',
        village: '',
        houseNo: '',
        moo: '',
        soi: '',
        road: '',
        subDistrict: '',
        district: '',
        province: '',
        postalCode: '',
      },
    },
    marital: {
      status: 'SINGLE',
      marriedDuringYear: false,
      spouseHasIncome: false,
    },
    children: {
      totalCount: 0,
      allowance30kCount: 0,
      allowance60kCount: 0,
    },
    parents: {
      self: { father: false, mother: false },
      spouse: { father: false, mother: false },
    },
    disability: {
      dependentsCount: 0,
    },
    insuranceAndFunds: {
        lifeInsuranceAmount: 0,
        healthInsuranceAmount: 0,
        selfParentsHealthInsuranceAmount: 0,
        spouseParentsHealthInsuranceAmount: 0,
        providentFundAmount: 0,
        governmentPensionFundAmount: 0,
        nationalSavingsFundAmount: 0,
        rmfAmount: 0,
        ltfAmount: 0,
    },
    otherDeductions: {
        homeLoanInterestAmount: 0,
        socialSecurityAmount: 0,
        educationDonationAmount: 0,
        otherDonationAmount: 0,
        otherDonationDescription: '',
    },
  },
  declaredDate: '',
  verifiedBySelf: false,
};


export function TaxProfileForm({ employee }: TaxProfileFormProps) {
  const db = useFirestore();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const ly01Profile = employee.taxProfile?.ly01;

  const form = useForm<Ly01FormData>({
    resolver: zodResolver(ly01FormSchema),
    // Initialize with defaults to prevent uncontrolled -> controlled warning
    defaultValues: defaultLy01Data,
  });

  useEffect(() => {
    if (ly01Profile) {
        const declared = toDate(ly01Profile.declaredDate);
        
        const existingData = {
          data: ly01Profile.data,
          declaredDate: declared ? formatDate(declared) : undefined,
          verifiedBySelf: ly01Profile.verifiedBySelf || false,
        };
        
        // Deep merge defaults with existing data to ensure all fields are defined
        const mergedData = merge({}, defaultLy01Data, existingData);
        form.reset(mergedData);
    } else {
        // This case should be rare now, but good to have as a fallback
        form.reset(defaultLy01Data);
    }
  }, [ly01Profile, form]);
  
  const maritalStatus = form.watch('data.marital.status');


  const onSubmit = async (values: Ly01FormData) => {
    if (!db || !ly01Profile) return;
    setLoading(true);

    const isMandatoryFilled = !!values.data.personal?.taxId && !!values.data.marital?.status;
    let newStatus: Ly01Profile['status'] = ly01Profile.status || 'MISSING';

    if (newStatus === 'MISSING' || newStatus === 'DRAFT') {
        if (isMandatoryFilled && values.verifiedBySelf) {
            newStatus = 'SUBMITTED';
        } else if (isMandatoryFilled || Object.keys(form.formState.dirtyFields).length > 0) {
            newStatus = 'DRAFT';
        }
    }

    const dataToSave = {
      taxProfile: {
          ly01: {
            ...ly01Profile,
            status: newStatus,
            data: values.data,
            declaredDate: values.declaredDate ? Timestamp.fromDate(new Date(values.declaredDate)) : serverTimestamp(),
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
  
  const handleExport = () => {
    const currentPath = router.asPath;
    window.open(`${currentPath}/export`, '_blank');
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
                <Button variant="outline" size="sm" type="button" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
                <Badge variant={status === 'VERIFIED' ? 'default' : 'outline'} className="text-lg">
                  Status: {status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Personal Info */}
            <section>
              <h3 className="text-lg font-medium">Personal Information</h3>
              <Separator className="my-2" />
              <div className="space-y-4">
                 <FormField control={form.control} name="data.personal.taxId" render={({ field }) => (
                  <FormItem><FormLabel>Tax ID*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="data.personal.address.houseNo" render={({ field }) => (
                    <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="Full address details..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>
            </section>
            
             {/* Marital Status */}
            <section>
              <h3 className="text-lg font-medium">Marital Status</h3>
              <Separator className="my-2" />
               <div className="space-y-4">
                 <FormField control={form.control} name="data.marital.status" render={({ field }) => (
                    <FormItem><FormLabel>Marital Status*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="SINGLE">Single</SelectItem>
                                <SelectItem value="MARRIED">Married</SelectItem>
                                <SelectItem value="WIDOWED">Widowed</SelectItem>
                                <SelectItem value="DIVORCED">Divorced</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />
                {maritalStatus === 'MARRIED' && (
                     <FormField control={form.control} name="data.marital.spouseHasIncome" render={({ field }) => (
                        <FormItem className="flex items-center gap-2 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Spouse has income?</FormLabel><FormMessage /></FormItem>
                    )}/>
                )}
              </div>
            </section>

             {/* Children */}
            <section>
              <h3 className="text-lg font-medium">Children Allowance</h3>
              <Separator className="my-2" />
               <div className="grid grid-cols-3 gap-4">
                 <FormField control={form.control} name="data.children.totalCount" render={({ field }) => (
                    <FormItem><FormLabel>Total Children</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="data.children.allowance30kCount" render={({ field }) => (
                    <FormItem><FormLabel>Born before 2018 (30k)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="data.children.allowance60kCount" render={({ field }) => (
                    <FormItem><FormLabel>Born 2018+ (60k)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </section>

            {/* Other Sections Placeholder */}
            <p className="text-center text-muted-foreground italic py-4">... Other sections (Parents, Disability, Insurance, Funds, Other Deductions) under construction ...</p>


            {/* Verification */}
            <section>
              <h3 className="text-lg font-medium">Verification</h3>
              <Separator className="my-2" />
               <FormField control={form.control} name="verifiedBySelf" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I confirm that the information provided is accurate and complete.</FormLabel>
                     <FormDescription>By checking this box, you are digitally signing this form.</FormDescription>
                  </div>
                </FormItem>
              )} />
               <FormField control={form.control} name="declaredDate" render={({ field }) => (
                  <FormItem className="mt-4"><FormLabel>Declared Date*</FormLabel><FormControl><Input placeholder="dd/MM/yyyy" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </section>

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
