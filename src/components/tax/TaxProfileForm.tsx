

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
      fullNameSnapshot: '',
      addressText: '',
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
    defaultValues: defaultLy01Data,
  });

  useEffect(() => {
    // Start with the comprehensive default object.
    let formData = merge({}, defaultLy01Data);

    // If there's an existing profile, merge its data on top of the defaults.
    if (ly01Profile?.data) {
        const declared = toDate(ly01Profile.declaredDate);
        const existingData = {
          data: ly01Profile.data,
          declaredDate: declared ? formatDate(declared) : undefined,
          verifiedBySelf: ly01Profile.verifiedBySelf || false,
        };
        formData = merge(formData, existingData);
    }
    
    // --- Prefill Logic ---
    // Only prefill if the target field in the LY01 form data is still empty.
    if (!formData.data.personal.taxId) {
        const taxIdToPrefill = employee.personalInfo.taxId || employee.personalInfo.nationalId;
        if (taxIdToPrefill) {
            formData.data.personal.taxId = taxIdToPrefill;
        }
    }
    
    if (!formData.data.personal.addressText) {
        // Prefers a simple string address.
        const addressToPrefill = employee.personalInfo.address;
        if (addressToPrefill) {
            formData.data.personal.addressText = addressToPrefill;
        }
    }

    // Always snapshot the current full name for the PDF export.
    formData.data.personal.fullNameSnapshot = `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`;

    // Reset the form with the final, merged, and prefilled data.
    form.reset(formData);

  }, [ly01Profile, employee, form]);
  
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
            declaredDate: values.declaredDate ? Timestamp.fromDate(parse(values.declaredDate, 'dd/MM/yyyy', new Date())) : serverTimestamp(),
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
    const currentPath = window.location.pathname;
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
                  <FormItem>
                    <FormLabel>Tax ID*</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormDescription>Prefilled from employee National ID.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="data.personal.addressText" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl><Textarea placeholder="Full address details..." {...field} value={field.value ?? ''} /></FormControl>
                        <FormDescription>Prefilled from employee profile address.</FormDescription>
                        <FormMessage />
                    </FormItem>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="SINGLE">Single</SelectItem>
                                <SelectItem value="MARRIED">Married</SelectItem>
                                <SelectItem value="WIDOWED">Widowed</SelectItem>
                                <SelectItem value="DIVORCED">Divorced</SelectItem>
                                <SelectItem value="DECEASED_DURING_YEAR">Deceased During Year</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />
                {maritalStatus === 'MARRIED' && (
                  <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="data.marital.spouseHasIncome" render={({ field }) => (
                        <FormItem className="flex items-center gap-2 pt-2"><FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl><FormLabel>Spouse has income?</FormLabel><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="data.marital.marriedDuringYear" render={({ field }) => (
                        <FormItem className="flex items-center gap-2 pt-2"><FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl><FormLabel>Married during this tax year?</FormLabel><FormMessage /></FormItem>
                    )}/>
                  </div>
                )}
              </div>
            </section>

             {/* Children */}
            <section>
              <h3 className="text-lg font-medium">Children Allowance</h3>
              <Separator className="my-2" />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="data.children.totalCount" render={({ field }) => (
                  <FormItem><FormLabel>Total Children</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="data.children.allowance30kCount" render={({ field }) => (
                  <FormItem><FormLabel>Born before 2018 (30k)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="data.children.allowance60kCount" render={({ field }) => (
                  <FormItem><FormLabel>Born 2018+ (60k)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </section>

            {/* Parents */}
            <section>
              <h3 className="text-lg font-medium">Parents Allowance</h3>
              <Separator className="my-2" />
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Your Parents</h4>
                    <FormField control={form.control} name="data.parents.self.father" render={({ field }) => (
                        <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl><FormLabel>Supporting own Father (age &gt; 60)</FormLabel><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="data.parents.self.mother" render={({ field }) => (
                        <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl><FormLabel>Supporting own Mother (age &gt; 60)</FormLabel><FormMessage /></FormItem>
                    )}/>
                  </div>
                   <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Spouse's Parents</h4>
                     <FormField control={form.control} name="data.parents.spouse.father" render={({ field }) => (
                        <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} disabled={maritalStatus !== 'MARRIED'} /></FormControl><FormLabel>Supporting spouse's Father (age &gt; 60)</FormLabel><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="data.parents.spouse.mother" render={({ field }) => (
                        <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} disabled={maritalStatus !== 'MARRIED'} /></FormControl><FormLabel>Supporting spouse's Mother (age &gt; 60)</FormLabel><FormMessage /></FormItem>
                    )}/>
                  </div>
               </div>
            </section>
            
            {/* Disability */}
            <section>
                 <h3 className="text-lg font-medium">Disability Allowance</h3>
                 <Separator className="my-2" />
                 <FormField control={form.control} name="data.disability.dependentsCount" render={({ field }) => (
                    <FormItem className="max-w-xs"><FormLabel>Number of disabled dependents</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                )} />
            </section>

             {/* Insurance and Funds */}
            <section>
                 <h3 className="text-lg font-medium">Insurance &amp; Funds</h3>
                 <Separator className="my-2" />
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="data.insuranceAndFunds.lifeInsuranceAmount" render={({ field }) => (
                        <FormItem><FormLabel>Life Insurance</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="data.insuranceAndFunds.healthInsuranceAmount" render={({ field }) => (
                        <FormItem><FormLabel>Health Insurance</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="data.insuranceAndFunds.selfParentsHealthInsuranceAmount" render={({ field }) => (
                        <FormItem><FormLabel>Parents' Health Insurance</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="data.insuranceAndFunds.providentFundAmount" render={({ field }) => (
                        <FormItem><FormLabel>Provident Fund</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="data.insuranceAndFunds.rmfAmount" render={({ field }) => (
                        <FormItem><FormLabel>RMF</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="data.insuranceAndFunds.ltfAmount" render={({ field }) => (
                        <FormItem><FormLabel>LTF</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                      <FormField control={form.control} name="data.insuranceAndFunds.governmentPensionFundAmount" render={({ field }) => (
                        <FormItem><FormLabel>Gov Pension Fund (กบข.)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                      <FormField control={form.control} name="data.insuranceAndFunds.nationalSavingsFundAmount" render={({ field }) => (
                        <FormItem><FormLabel>National Savings Fund (กอช.)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                 </div>
            </section>
            
             {/* Other Deductions */}
            <section>
                 <h3 className="text-lg font-medium">Other Deductions</h3>
                 <Separator className="my-2" />
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     <FormField control={form.control} name="data.otherDeductions.homeLoanInterestAmount" render={({ field }) => (
                        <FormItem><FormLabel>Home Loan Interest</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="data.otherDeductions.socialSecurityAmount" render={({ field }) => (
                        <FormItem><FormLabel>Social Security (SSO)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="data.otherDeductions.educationDonationAmount" render={({ field }) => (
                        <FormItem><FormLabel>Education/Sport Donation</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="data.otherDeductions.otherDonationAmount" render={({ field }) => (
                        <FormItem><FormLabel>General Donation</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                    )}/>
                 </div>
            </section>

            {/* Verification */}
            <section>
              <h3 className="text-lg font-medium">Verification</h3>
              <Separator className="my-2" />
               <FormField control={form.control} name="verifiedBySelf" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>I confirm that the information provided is accurate and complete.</FormLabel>
                     <FormDescription>By checking this box, you are digitally signing this form.</FormDescription>
                  </div>
                </FormItem>
              )} />
               <FormField control={form.control} name="declaredDate" render={({ field }) => (
                  <FormItem className="mt-4"><FormLabel>Declared Date*</FormLabel><FormControl><Input placeholder="dd/MM/yyyy" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
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
