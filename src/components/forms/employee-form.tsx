
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
  query,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  where,
} from 'firebase/firestore';
import { format, parse, isValid, getYear, getMonth } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Trash2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { type Employee } from '@/types/employee';
import { type OfficePosition, type ManpowerPosition } from '@/types/position';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { CertificateType } from '@/types/certificate-type';
import { Hospital } from '@/types/hospital';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types/user';
import { DATE_FORMAT, toDate } from '@/lib/utils';

const dateStringSchema = z.string().refine(val => val === '' || isValid(parse(val, DATE_FORMAT, new Date())), {
    message: `Invalid date. Please use the format ${DATE_FORMAT} or leave it empty.`,
});

const documentSchema = z.object({
  type: z.enum(['Passport', 'Seaman Book', 'Certificate']),
  name: z.string().min(1, 'Document name/number is required.'),
  certificateTypeId: z.string().optional(),
  issueDate: dateStringSchema.optional(),
  expiryDate: dateStringSchema.optional(),
});

// Base schema for properties common to all employees
const baseEmployeeSchema = z.object({
  employeeType: z.enum(['OFFICE', 'FIELD']),
  personalInfo: z.object({
    firstName: z.string().min(1, 'First name is required.'),
    lastName: z.string().min(1, 'Last name is required.'),
    dateOfBirth: dateStringSchema.optional(),
    nationalId: z.string().optional(),
    address: z.string().optional(),
    emergencyContact: z.object({
        name: z.string().optional(),
        relationship: z.string().optional(),
        phone: z.string().optional(),
    }).optional(),
  }),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  }),
  financeInfo: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    socialSecurity: z.object({
        has: z.boolean(),
        hospitalId: z.string().optional(),
    }).optional(),
  }),
  positionIds: z.array(z.string()).min(1, 'At least one position must be selected.'),
  skillTags: z.string().optional(),
  employmentStatus: z.enum(['Active', 'Inactive', 'Terminated']),
  documents: z.array(documentSchema).optional(),
});

// Schema specific to Office employees, includes orgLevel and user creation fields
const officeEmployeeSchema = baseEmployeeSchema.extend({
  employeeType: z.literal('OFFICE'),
  orgLevel: z.enum(['STAFF', 'MANAGER', 'EXECUTIVE']),
  createUser: z.boolean(),
  userEmail: z.string().email('Invalid email address.').optional().or(z.literal('')),
}).refine(data => {
    if (data.createUser && !data.userEmail) {
        return false;
    }
    return true;
}, {
    message: 'Email is required to create a user account.',
    path: ['userEmail'],
});

// Schema for Field employees, does not have orgLevel or user creation
const fieldEmployeeSchema = baseEmployeeSchema.extend({
    employeeType: z.literal('FIELD'),
});


const formSchema = z.discriminatedUnion('employeeType', [
    officeEmployeeSchema,
    fieldEmployeeSchema,
]);


type EmployeeFormData = z.infer<typeof formSchema>;

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeType: 'OFFICE' | 'FIELD';
  employee?: Employee | null;
  onSuccess?: (employeeId?: string) => void;
}


export default function EmployeeForm({
  open,
  onOpenChange,
  employeeType,
  employee,
  onSuccess,
}: EmployeeFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const hospitalsQuery = useMemoFirebase(() => (db ? collection(db, 'hospitals') : null), [db]);
  const { data: hospitals, isLoading: isLoadingHospitals } = useCollection<Hospital>(hospitalsQuery);

  const officePositionsQuery = useMemoFirebase(() => (db ? query(collection(db, 'officePositions')) : null), [db]);
  const { data: officePositions, isLoading: isLoadingOfficePos } = useCollection<OfficePosition>(officePositionsQuery);
  
  const manpowerPositionsQuery = useMemoFirebase(() => (db ? query(collection(db, 'manpowerPositions')) : null), [db]);
  const { data: manpowerPositions, isLoading: isLoadingManpowerPos } = useCollection<ManpowerPosition>(manpowerPositionsQuery);

  const certificateTypesQuery = useMemoFirebase(() => (db ? collection(db, 'certificateTypes') : null), [db]);
  const { data: certificateTypes, isLoading: isLoadingCertTypes } = useCollection<CertificateType>(certificateTypesQuery);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: employeeType === 'OFFICE'
    ? {
        employeeType: 'OFFICE',
        orgLevel: 'STAFF',
        personalInfo: { firstName: '', lastName: '', dateOfBirth: '', nationalId: '', address: '' },
        contactInfo: { phone: '', email: ''},
        financeInfo: { bankName: '', accountNumber: '', socialSecurity: { has: false, hospitalId: '' } },
        positionIds: [],
        skillTags: '',
        employmentStatus: 'Active',
        documents: [],
        createUser: true,
        userEmail: '',
    }
    : {
        employeeType: 'FIELD',
        personalInfo: { firstName: '', lastName: '', dateOfBirth: '', nationalId: '', address: '' },
        contactInfo: { phone: '', email: ''},
        financeInfo: { bankName: '', accountNumber: '', socialSecurity: { has: false, hospitalId: '' } },
        positionIds: [],
        skillTags: '',
        employmentStatus: 'Active',
        documents: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "documents"
  });

  const hasSocialSecurity = form.watch('financeInfo.socialSecurity.has');
  const shouldCreateUser = employeeType === 'OFFICE' ? form.watch('createUser') : false;

  const availablePositions = useMemo(() => {
    if (employeeType === 'OFFICE') return officePositions;
    return manpowerPositions;
  }, [employeeType, officePositions, manpowerPositions]);

  const availableCertTypes = useMemo(() => {
    if (!certificateTypes) return [];
    return certificateTypes.filter(c => c.type === (employeeType === 'OFFICE' ? 'OFFICE' : 'FIELD') || c.type === 'GENERAL');
  }, [certificateTypes, employeeType]);

  useEffect(() => {
    if (open) {
      if (employee) {
        const dob = toDate(employee.personalInfo.dateOfBirth);
        
        const defaultData = {
          employeeType: employee.employeeType || employeeType,
          personalInfo: {
            firstName: employee.personalInfo.firstName || '',
            lastName: employee.personalInfo.lastName || '',
            dateOfBirth: dob ? format(dob, DATE_FORMAT) : '',
            nationalId: employee.personalInfo.nationalId || '',
            address: employee.personalInfo.address || '',
            emergencyContact: employee.personalInfo.emergencyContact || { name: '', relationship: '', phone: '' },
          },
          contactInfo: {
            phone: employee.contactInfo?.phone || '',
            email: employee.contactInfo?.email || '',
          },
          financeInfo: {
            bankName: employee.financeInfo?.bankName || '',
            accountNumber: employee.financeInfo?.accountNumber || '',
            socialSecurity: employee.financeInfo?.socialSecurity || { has: false, hospitalId: '' },
          },
          positionIds: employee.positionIds || [],
          skillTags: employee.skillTags?.join(', ') || '',
          employmentStatus: employee.employmentStatus || 'Active',
          documents: employee.documents?.map(doc => {
            const issueD = toDate(doc.issueDate);
            const expiryD = toDate(doc.expiryDate);
            return {
                ...doc,
                issueDate: issueD ? format(issueD, DATE_FORMAT) : '',
                expiryDate: expiryD ? format(expiryD, DATE_FORMAT) : '',
            };
          }) || [],
        };

        if (employee.employeeType === 'OFFICE') {
          form.reset({
            ...defaultData,
            employeeType: 'OFFICE',
            orgLevel: employee.orgLevel || 'STAFF',
            createUser: false, // Don't show for existing employees
            userEmail: employee.contactInfo?.email || '',
          });
        } else {
           form.reset({
            ...defaultData,
            employeeType: 'FIELD',
           });
        }

      } else {
        // Reset to default for creating new
        form.reset(employeeType === 'OFFICE'
            ? {
                employeeType: 'OFFICE',
                orgLevel: 'STAFF',
                personalInfo: { firstName: '', lastName: '', dateOfBirth: '', nationalId: '', address: '' },
                contactInfo: { phone: '', email: ''},
                financeInfo: { bankName: '', accountNumber: '', socialSecurity: { has: false, hospitalId: '' } },
                positionIds: [],
                skillTags: '',
                employmentStatus: 'Active',
                documents: [],
                createUser: true,
                userEmail: '',
            }
            : {
                employeeType: 'FIELD',
                personalInfo: { firstName: '', lastName: '', dateOfBirth: '', nationalId: '', address: '' },
                contactInfo: { phone: '', email: ''},
                financeInfo: { bankName: '', accountNumber: '', socialSecurity: { has: false, hospitalId: '' } },
                positionIds: [],
                skillTags: '',
                employmentStatus: 'Active',
                documents: [],
            });
      }
    }
  }, [open, employee, employeeType, form]);

  const getNextEmployeeCode = async (): Promise<string> => {
    if (!db) throw new Error("Firestore not initialized");
    const q = query(collection(db, 'employees'), orderBy('employeeCode', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 'EMP-0001';
    }
    
    const lastEmployee = querySnapshot.docs[0].data() as Employee;
    const lastCode = lastEmployee.employeeCode;
    const lastNumber = parseInt(lastCode.split('-')[1], 10);
    const newNumber = lastNumber + 1;
    return `EMP-${String(newNumber).padStart(4, '0')}`;
  };

  const onSubmit = async (values: EmployeeFormData) => {
    if (!userProfile || !db) return;
    setLoading(true);

    try {
        if (values.employeeType === 'OFFICE' && !employee && values.createUser && values.userEmail) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', values.userEmail));
            const existingUserSnap = await getDocs(q);
            if (!existingUserSnap.empty) {
                form.setError('userEmail', { message: 'This email is already registered as a system user.' });
                setLoading(false);
                return;
            }
        }
      
      const skillTagsArray = values.skillTags ? values.skillTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      
      const parseAndGetTimestamp = (dateValue: any) => {
          if (!dateValue) return undefined;
          if (typeof dateValue === 'string') {
              const parsed = parse(dateValue, DATE_FORMAT, new Date());
              if (isValid(parsed)) return Timestamp.fromDate(parsed);
          }
          return undefined;
      }

      const documentsWithTimestamps = values.documents?.map(doc => ({
          ...doc,
          name: doc.type === 'Certificate' ? availableCertTypes.find(ct => ct.id === doc.certificateTypeId)?.name || doc.name : doc.name,
          issueDate: parseAndGetTimestamp(doc.issueDate),
          expiryDate: parseAndGetTimestamp(doc.expiryDate),
      })).filter(d => d.name);
      
      const dataToSave: any = {
        ...values,
        employeeType: employeeType,
        personalInfo: {
          ...values.personalInfo,
          dateOfBirth: parseAndGetTimestamp(values.personalInfo.dateOfBirth),
        },
        contactInfo: {
            ...values.contactInfo,
            email: values.employeeType === 'OFFICE' && values.createUser ? values.userEmail : values.contactInfo.email,
        },
        financeInfo: {
            ...values.financeInfo,
            socialSecurity: {
                ...values.financeInfo?.socialSecurity,
                hospitalId: values.financeInfo?.socialSecurity?.has ? values.financeInfo.socialSecurity.hospitalId : '',
            }
        },
        positionIds: values.positionIds,
        skillTags: skillTagsArray,
        documents: documentsWithTimestamps,
        updatedAt: serverTimestamp(),
      };
      // Remove fields specific to office employees if type is field
      if (dataToSave.employeeType === 'FIELD') {
          delete dataToSave.orgLevel;
          delete dataToSave.createUser;
          delete dataToSave.userEmail;
      }


      if (employee) {
        const employeeRef = doc(db, 'employees', employee.id);
        await updateDoc(employeeRef, dataToSave);
        toast({
          title: 'Success',
          description: 'Employee updated successfully.',
        });
        onSuccess?.(employee.id);
      } else {
        const batch = writeBatch(db);

        const employeeCode = await getNextEmployeeCode();
        const now = new Date();
        const effectiveMonth = `${getYear(now)}-${String(getMonth(now) + 1).padStart(2, '0')}`;

        const employeeRef = doc(collection(db, 'employees'));
        batch.set(employeeRef, {
            ...dataToSave,
            employeeCode,
            assignmentStatus: 'Available',
            taxProfile: {
                ly01: {
                    status: 'MISSING',
                    version: 1,
                    effectiveMonth: effectiveMonth,
                    updatedAt: serverTimestamp(),
                    updatedBy: 'SYSTEM',
                    data: {},
                    attachments: [],
                }
            },
            createdAt: serverTimestamp(),
            createdBy: userProfile.displayName || userProfile.email,
        });

        if (values.employeeType === 'OFFICE' && values.createUser && values.userEmail) {
            const userRef = doc(collection(db, 'users'));
            batch.set(userRef, {
                uid: userRef.id,
                email: values.userEmail,
                displayName: `${values.personalInfo.firstName} ${values.personalInfo.lastName}`,
                isAdmin: false,
                roleIds: [],
                status: 'ACTIVE',
                employeeId: employeeRef.id,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
        await batch.commit();
        toast({
          title: 'Success',
          description: `Employee ${employeeCode} created successfully.`,
        });
        onSuccess?.(employeeRef.id);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving employee:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem saving the employee data.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit' : 'Add New'} {employeeType === 'FIELD' ? 'Manpower' : 'Office'} Employee</DialogTitle>
          <DialogDescription>
            Fill in the details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            
            {employeeType === 'OFFICE' && (
             <>
                <h3 className="text-lg font-medium">Employment Details</h3>
                <FormField control={form.control} name="orgLevel" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Organizational Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="STAFF">STAFF</SelectItem>
                                <SelectItem value="MANAGER">MANAGER</SelectItem>
                                <SelectItem value="EXECUTIVE">EXECUTIVE</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
            </>
            )}
            
            <h3 className="text-lg font-medium pt-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="personalInfo.firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="personalInfo.lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="personalInfo.dateOfBirth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input placeholder={DATE_FORMAT} {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="personalInfo.nationalId" render={({ field }) => (
                <FormItem><FormLabel>National ID No.</FormLabel><FormControl><Input placeholder="1234567890123" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="personalInfo.address" render={({ field }) => (
              <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="Full address" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <h3 className="text-lg font-medium pt-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contactInfo.phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+66 12 345 6789" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactInfo.email" render={({ field }) => (
                <FormItem><FormLabel>Personal Email Address</FormLabel><FormControl><Input placeholder="personal@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="personalInfo.emergencyContact.name" render={({ field }) => (
                    <FormItem><FormLabel>Emergency Contact</FormLabel><FormControl><Input placeholder="Contact's Name" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="personalInfo.emergencyContact.relationship" render={({ field }) => (
                    <FormItem><FormLabel>Relationship</FormLabel><FormControl><Input placeholder="e.g. Spouse" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="personalInfo.emergencyContact.phone" render={({ field }) => (
                    <FormItem><FormLabel>Contact's Phone</FormLabel><FormControl><Input placeholder="+66 98 765 4321" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            
            {!employee && employeeType === 'OFFICE' && (
                <>
                <Separator />
                <h3 className="text-lg font-medium">System User Account</h3>
                 <div className="space-y-4 rounded-lg border p-4">
                    <FormField control={form.control} name="createUser" render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                             <div className="space-y-1 leading-none">
                                <FormLabel>Create a system user account for this employee</FormLabel>
                                <FormDescription>This will allow the employee to log in to the system.</FormDescription>
                             </div>
                        </FormItem>
                    )} />
                    {shouldCreateUser && (
                        <FormField control={form.control} name="userEmail" render={({ field }) => (
                            <FormItem>
                                <FormLabel>User Email (for login)</FormLabel>
                                <FormControl><Input placeholder="login.email@company.com" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    )}
                 </div>
                </>
            )}

            <h3 className="text-lg font-medium pt-4">Finance & Social Security</h3>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="financeInfo.bankName" render={({ field }) => (
                    <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g. Kasikornbank" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="financeInfo.accountNumber" render={({ field }) => (
                    <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="123-4-56789-0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="space-y-4 rounded-lg border p-4">
                 <FormField control={form.control} name="financeInfo.socialSecurity.has" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel>Has Social Security (มีประกันสังคม)</FormLabel>
                    </FormItem>
                )} />
                {hasSocialSecurity && (
                    <FormField control={form.control} name="financeInfo.socialSecurity.hospitalId" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Registered Hospital</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a hospital..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {isLoadingHospitals ? (<SelectItem value="loading" disabled>Loading...</SelectItem>) : (
                                        hospitals?.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)
                                    )}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                )}
            </div>
            
            <h3 className="text-lg font-medium pt-4">Positions & Skills</h3>
            <FormField name="positionIds" render={() => (
                <FormItem>
                    <FormLabel>Positions ({employeeType === 'OFFICE' ? 'พนักงานออฟฟิศ' : 'ลูกจ้างแมนพาวเวอร์'})</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 rounded-md border p-4">
                    {(availablePositions || []).map((pos) => (
                        <FormField key={pos.id} control={form.control} name="positionIds" render={({ field }) => (
                            <FormItem key={pos.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                    checked={field.value?.includes(pos.id)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                        ? field.onChange([...(field.value || []), pos.id])
                                        : field.onChange(field.value?.filter((value) => value !== pos.id))
                                    }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">{pos.name}</FormLabel>
                            </FormItem>
                        )} />
                    ))}
                    </div>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="skillTags" render={({ field }) => (
                <FormItem><FormLabel>Skill Tags</FormLabel><FormControl><Input placeholder="e.g. Welding, 6G, TIG" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="employmentStatus" render={({ field }) => (
                <FormItem>
                    <FormLabel>Employment Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                            <SelectItem value="Terminated">Terminated</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            
            <Separator />
            
            <h3 className="text-lg font-medium">Certificates & Documents</h3>
            <div className="space-y-4">
                {fields.map((field, index) => {
                    const docType = form.watch(`documents.${index}.type`);
                    return (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end border p-4 rounded-md relative">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <FormField control={form.control} name={`documents.${index}.type`} render={({ field }) => (
                            <FormItem><FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Passport">Passport</SelectItem>
                                        <SelectItem value="Seaman Book">Seaman Book</SelectItem>
                                        <SelectItem value="Certificate">Certificate</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        {docType === 'Certificate' ? (
                            <FormField control={form.control} name={`documents.${index}.certificateTypeId`} render={({ field }) => (
                                <FormItem><FormLabel>Certificate Name</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select from list..."/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {availableCertTypes.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        ) : (
                             <FormField control={form.control} name={`documents.${index}.name`} render={({ field }) => (
                                <FormItem><FormLabel>Document Name / No.</FormLabel><FormControl><Input {...field} placeholder={docType === 'Passport' ? 'Passport Number' : 'Document Name'}/></FormControl><FormMessage /></FormItem>
                            )}/>
                        )}
                        <FormField control={form.control} name={`documents.${index}.issueDate`} render={({ field }) => (
                            <FormItem><FormLabel>Issue Date</FormLabel><FormControl><Input placeholder={DATE_FORMAT} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name={`documents.${index}.expiryDate`} render={({ field }) => (
                            <FormItem><FormLabel>Expiry Date</FormLabel><FormControl><Input placeholder={DATE_FORMAT} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                )})}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ type: 'Certificate', name: '', issueDate: '', expiryDate: '' })}>
                    Add Document
                </Button>
            </div>

            <DialogFooter className="pt-4 flex justify-between items-center">
                <div className='flex gap-2'>
                    {employee && <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/dashboard/employees/${employee.id}/ly01`)}><FileText className='mr-2 h-4 w-4' />แบบฟอร์ม ลย.01</Button>}
                </div>
              <div>
                <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Employee'}</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
