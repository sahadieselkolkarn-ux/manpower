

'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  collectionGroup,
  doc,
} from 'firebase/firestore';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, UserCheck } from 'lucide-react';
import FullPageLoader from '@/components/full-page-loader';
import { WaveWithProject } from '@/types/wave';
import { Employee } from '@/types/employee';
import { Assignment } from '@/types/assignment';
import { parseThaiDateToISO, formatThaiDateFromISO, formatDate } from '@/lib/date/thaiDate';
import { DATE_FORMAT } from '@/lib/utils';

const formSchema = z.object({
  waveId: z.string().min(1, 'A wave must be selected.'),
  employeeIds: z.array(z.string()).min(1, 'At least one employee must be selected.'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

function NewAssignmentFormComponent() {
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const wavesQuery = useMemoFirebase(() => db ? query(collectionGroup(db, 'waves')) : null, [db]);
  const { data: waves, isLoading: isLoadingWaves } = useCollection<WaveWithProject>(wavesQuery);

  const manpowerQuery = useMemoFirebase(() => db ? query(collection(db, 'employees'), where('employeeType', '==', 'FIELD')) : null, [db]);
  const { data: manpower, isLoading: isLoadingManpower } = useCollection<Employee>(manpowerQuery);

  const assignmentsQuery = useMemoFirebase(() => db ? query(collection(db, 'assignments')) : null, [db]);
  const { data: allAssignments, isLoading: isLoadingAssignments } = useCollection<Assignment>(assignmentsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      waveId: searchParams.get('waveId') || '',
      employeeIds: [],
    },
  });

  const selectedWaveId = form.watch('waveId');

  const availableEmployees = useMemo(() => {
    if (!manpower || !allAssignments || !selectedWaveId) return [];
    
    const assignedInWave = new Set(
      allAssignments
        .filter(a => a.waveId === selectedWaveId && a.status === 'ACTIVE')
        .map(a => a.employeeId)
    );

    return manpower
      .filter(emp => !assignedInWave.has(emp.id))
      .filter(emp => 
        emp.personalInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        emp.personalInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [manpower, allAssignments, selectedWaveId, searchTerm]);

  useEffect(() => {
    const waveId = searchParams.get('waveId');
    if (waveId) {
      form.setValue('waveId', waveId);
    }
  }, [searchParams, form]);

  useEffect(() => {
    if (selectedWaveId) {
      const selectedWave = waves?.find(w => w.id === selectedWaveId);
      if (selectedWave) {
        form.setValue('startDate', formatDate(selectedWave.planningWorkPeriod.startDate));
        form.setValue('endDate', formatDate(selectedWave.planningWorkPeriod.endDate));
      }
    } else {
        form.setValue('startDate', '');
        form.setValue('endDate', '');
    }
  }, [selectedWaveId, waves, form]);
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db || !userProfile) return;
    setLoading(true);
    
    const waveDocRef = waves?.find(w => w.id === values.waveId)?.ref;

    if (!waveDocRef) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected wave not found.' });
      setLoading(false);
      return;
    }
    const waveSnap = await getDoc(waveDocRef);
    if (!waveSnap.exists()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Wave document does not exist.' });
        setLoading(false);
        return;
    }
    const selectedWave = {id: waveSnap.id, ...waveSnap.data()} as WaveWithProject;
    const pathSegments = waveDocRef.path.split('/');
    const clientId = pathSegments[1];
    const contractId = pathSegments[3];
    const projectId = pathSegments[5];

    const parsedStartDate = values.startDate ? parseThaiDateToISO(values.startDate) : { ok: true, iso: '' };
    const parsedEndDate = values.endDate ? parseThaiDateToISO(values.endDate) : { ok: true, iso: '' };

    if (!parsedStartDate.ok) {
        form.setError('startDate', { message: parsedStartDate.error });
        setLoading(false);
        return;
    }
    if (!parsedEndDate.ok) {
        form.setError('endDate', { message: parsedEndDate.error });
        setLoading(false);
        return;
    }

    try {
      const batch = writeBatch(db);
      for (const employeeId of values.employeeIds) {
        const employee = manpower?.find(e => e.id === employeeId);
        if (!employee) continue;

        const q = query(collection(db, 'assignments'), where('waveId', '==', values.waveId), where('employeeId', '==', employeeId), where('status', '==', 'ACTIVE'));
        const existing = await getDocs(q);
        if (!existing.empty) {
            toast({ variant: 'destructive', title: 'Skipped Duplicate', description: `${employee.personalInfo.firstName} is already actively assigned to this wave.` });
            continue; // Skip this employee
        }

        const assignmentRef = doc(collection(db, 'assignments'));
        batch.set(assignmentRef, {
          waveId: values.waveId,
          projectId: projectId,
          clientId: clientId,
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
          employeeType: employee.employeeType,
          status: 'ACTIVE',
          startDate: parsedStartDate.iso || null,
          endDate: parsedEndDate.iso || null,
          notes: values.notes || '',
          createdAt: serverTimestamp(),
          createdBy: userProfile.uid,
        });
      }

      await batch.commit();
      toast({ title: 'Success', description: 'Assignments created successfully.' });
      router.push('/dashboard/hr/assignments');

    } catch (error) {
      console.error('Error creating assignments:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create assignments.' });
    } finally {
      setLoading(false);
    }
  };

  const isLoading = authLoading || isLoadingWaves || isLoadingManpower || isLoadingAssignments;

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Create New Assignments</CardTitle>
          <CardDescription>Select a wave and assign one or more manpower employees.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="waveId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>1. Select Wave</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!searchParams.get('waveId')}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Choose a wave..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {isLoadingWaves ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : waves && waves.length > 0 ? (
                           waves.map(w => <SelectItem key={w.id} value={w.id}>{w.waveCode}</SelectItem>)
                        ) : (
                          <SelectItem value="no-waves" disabled>No waves found.</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedWaveId && (
                <>
                  <div className="space-y-2">
                    <FormLabel>2. Select Employees</FormLabel>
                    <Input placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <ScrollArea className="h-64 rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <FormField
                                control={form.control}
                                name="employeeIds"
                                render={({ field }) => (
                                  <Checkbox
                                    checked={availableEmployees.length > 0 && field.value?.length === availableEmployees.length}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked ? availableEmployees.map(e => e.id) : [])
                                    }}
                                  />
                                )}
                              />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Code</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableEmployees.map(emp => (
                            <TableRow key={emp.id}>
                              <TableCell>
                                 <FormField
                                  control={form.control}
                                  name="employeeIds"
                                  render={({ field }) => (
                                    <Checkbox
                                      checked={field.value?.includes(emp.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), emp.id])
                                          : field.onChange(field.value?.filter((id) => id !== emp.id));
                                      }}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>{emp.personalInfo.firstName} {emp.personalInfo.lastName}</TableCell>
                              <TableCell>{emp.employeeCode}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                     <FormMessage>{form.formState.errors.employeeIds?.message}</FormMessage>
                  </div>

                  <div className="space-y-2">
                     <FormLabel>3. Assignment Period</FormLabel>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem><FormLabel className="text-muted-foreground font-normal">Start Date</FormLabel><FormControl><Input placeholder={DATE_FORMAT} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem><FormLabel className="text-muted-foreground font-normal">End Date</FormLabel><FormControl><Input placeholder={DATE_FORMAT} {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                     </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Assigning...' : `Assign ${form.getValues('employeeIds')?.length || 0} Employees`}
                    </Button>
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


export default function NewAssignmentPage() {
    return (
        <Suspense fallback={<FullPageLoader />}>
            <NewAssignmentFormComponent />
        </Suspense>
    )
}
