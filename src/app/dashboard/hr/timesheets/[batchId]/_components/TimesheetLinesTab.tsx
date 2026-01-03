
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, where, doc, writeBatch, Timestamp, serverTimestamp, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { TimesheetBatch, TimesheetLine } from '@/types/timesheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parse, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Assignment } from '@/types/assignment';

interface TimesheetLinesTabProps {
    batch: TimesheetBatch;
}

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

const lineFormSchema = z.object({
  assignmentId: z.string().min(1, 'Please select an assigned employee.'),
  workDate: dateSchema,
  workType: z.enum(['NORMAL', 'STANDBY', 'LEAVE']),
  normalHours: z.coerce.number().min(0, 'Cannot be negative'),
  otHours: z.coerce.number().min(0, 'Cannot be negative'),
}).refine(data => {
    if (data.workType === 'LEAVE') return data.normalHours === 0 && data.otHours === 0;
    return true;
}, {
    message: 'For LEAVE, normal and OT hours must be 0.',
    path: ['normalHours'],
}).refine(data => {
    if (data.workType === 'STANDBY') return data.otHours === 0;
    return true;
}, {
    message: 'OT is not allowed for STANDBY.',
    path: ['otHours'],
});


function LineForm({ batch, open, onOpenChange, onSuccess, line, assignments }: { batch: TimesheetBatch, open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void, line?: TimesheetLine | null, assignments: Assignment[] }) {
    const [loading, setLoading] = useState(false);
    const db = useFirestore();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof lineFormSchema>>({
        resolver: zodResolver(lineFormSchema),
        defaultValues: {
            assignmentId: '',
            workDate: new Date(),
            workType: 'NORMAL',
            normalHours: 8,
            otHours: 0,
        }
    });

    React.useEffect(() => {
        if (open) {
          if (line) {
            form.reset({
              ...line,
              workDate: line.workDate.toDate(),
              workType: line.workType || 'NORMAL',
            });
          } else {
            form.reset({
              assignmentId: '',
              workDate: batch.periodStart.toDate(),
              workType: 'NORMAL',
              normalHours: 8,
              otHours: 0,
            });
          }
        }
      }, [open, line, batch, form]);

    const onSubmit = async (values: z.infer<typeof lineFormSchema>) => {
        if (!db) return;
        setLoading(true);

        const selectedAssignment = assignments.find(a => a.id === values.assignmentId);
        if (!selectedAssignment) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selected assignment not found.' });
            setLoading(false);
            return;
        }

        const batchRef = doc(db, 'timesheetBatches', batch.id);
        const lineRef = line ? doc(db, 'timesheetLines', line.id) : doc(collection(db, 'timesheetLines'));

        const data = {
            ...values,
            employeeId: selectedAssignment.employeeId, // Denormalize employeeId for easier querying
            batchId: batch.id,
            workDate: Timestamp.fromDate(values.workDate),
            updatedAt: serverTimestamp(),
        };

        const batchUpdateData = {
            status: 'CLIENT_APPROVED_RECEIVED' as const, // Revert status if validated
            updatedAt: serverTimestamp(),
        };

        try {
            const firestoreBatch = writeBatch(db);
            if (line) {
                firestoreBatch.update(lineRef, data);
            } else {
                firestoreBatch.set(lineRef, { ...data, createdAt: serverTimestamp() });
            }
            firestoreBatch.update(batchRef, batchUpdateData);

            await firestoreBatch.commit();

            toast({ title: 'Success', description: `Timesheet line ${line ? 'updated' : 'created'}.` });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving line:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save timesheet line.' });
        } finally {
            setLoading(false);
        }
    }
    
    const workType = form.watch('workType');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{line ? 'Edit' : 'Add'} Timesheet Line</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="assignmentId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assigned Employee</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!line}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an assigned employee..."/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {assignments.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.employeeName} ({a.positionName})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                         <FormField control={form.control} name="workDate" render={({ field }) => (
                            <FormItem><FormLabel>Work Date</FormLabel><FormControl><Input placeholder={DATE_FORMAT} {...field} value={field.value ? format(field.value, DATE_FORMAT) : ''}/></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="workType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Work Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="NORMAL">NORMAL</SelectItem>
                                        <SelectItem value="STANDBY">STANDBY</SelectItem>
                                        <SelectItem value="LEAVE">LEAVE</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="normalHours" render={({ field }) => (
                                <FormItem><FormLabel>Normal Hours</FormLabel><FormControl><Input type="number" {...field} disabled={workType === 'LEAVE'} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="otHours" render={({ field }) => (
                                <FormItem><FormLabel>OT Hours</FormLabel><FormControl><Input type="number" {...field} disabled={workType !== 'NORMAL'} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Line'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function TimesheetLinesTab({ batch }: TimesheetLinesTabProps) {
    const db = useFirestore();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedLine, setSelectedLine] = useState<TimesheetLine | null>(null);

    const linesQuery = useMemoFirebase(
        () => (db ? query(collection(db, 'timesheetLines'), where('batchId', '==', batch.id)) : null),
        [db, batch.id]
    );
    const { data: lines, isLoading, refetch } = useCollection<TimesheetLine>(linesQuery);
    
    const assignmentsQuery = useMemoFirebase(() => {
        if (!db || !batch.waveId) return null;
        const assignmentPath = `clients/${batch.clientId}/contracts/${batch.contractId}/projects/${batch.projectId}/waves/${batch.waveId}/assignments`;
        return query(collection(db, assignmentPath));
    }, [db, batch.clientId, batch.contractId, batch.projectId, batch.waveId]);
    const { data: assignments, isLoading: isLoadingAssignments } = useCollection<Assignment>(assignmentsQuery);
    const assignmentMap = useMemo(() => new Map(assignments?.map(a => [a.id, a])), [assignments]);


    const sortedLines = useMemo(() => {
        if (!lines) return [];
        return [...lines].sort((a, b) => a.workDate.toMillis() - b.workDate.toMillis() || (assignmentMap.get(a.assignmentId)?.employeeName || '').localeCompare(assignmentMap.get(b.assignmentId)?.employeeName || ''));
    }, [lines, assignmentMap]);

    const isLocked = batch.status === 'HR_APPROVED';

    const handleAdd = () => {
        setSelectedLine(null);
        setIsFormOpen(true);
    };

    const handleEdit = (line: TimesheetLine) => {
        setSelectedLine(line);
        setIsFormOpen(true);
    };
    
    const handleDelete = async (lineId: string) => {
        if (!db) return;
        if (!confirm('Are you sure you want to delete this line?')) return;

        try {
            const batchRef = doc(db, 'timesheetBatches', batch.id);
            const lineRef = doc(db, 'timesheetLines', lineId);
            const firestoreBatch = writeBatch(db);
            firestoreBatch.delete(lineRef);
            firestoreBatch.update(batchRef, { status: 'CLIENT_APPROVED_RECEIVED', updatedAt: serverTimestamp() });
            await firestoreBatch.commit();

            toast({ title: 'Success', description: 'Line deleted.' });
            refetch();
        } catch (error) {
            console.error('Error deleting line:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete line.' });
        }
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Timesheet Lines</CardTitle>
                        <CardDescription>Enter or edit the work hours for this batch. Workers are populated from Wave assignments.</CardDescription>
                    </div>
                    {!isLocked && (
                        <Button onClick={handleAdd} disabled={!assignments || assignments.length === 0}><PlusCircle className="mr-2 h-4 w-4"/>Add Line</Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isLoadingAssignments && <p>Loading wave assignments...</p>}
                {!isLoadingAssignments && (!assignments || assignments.length === 0) && (
                     <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <UserX className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No Workers Assigned to this Wave</h3>
                        <p className="mt-1 text-sm text-gray-500">You must assign workers to the wave before adding timesheet lines.</p>
                    </div>
                )}
                
                {assignments && assignments.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Work Date</TableHead>
                                <TableHead>Employee</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Work Type</TableHead>
                                <TableHead>Normal</TableHead>
                                <TableHead>OT</TableHead>
                                <TableHead>Anomalies</TableHead>
                                {!isLocked && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={isLocked ? 7 : 8}><Skeleton className="h-5 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : sortedLines && sortedLines.length > 0 ? (
                                sortedLines.map(line => {
                                    const assignment = assignmentMap.get(line.assignmentId);
                                    return (
                                    <TableRow key={line.id} className={line.anomalies && line.anomalies.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                                        <TableCell>{line.workDate.toDate().toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{assignment?.employeeName || `(Unknown: ${line.employeeId})`}</TableCell>
                                        <TableCell>{assignment?.positionName || '(Unknown)'}</TableCell>
                                        <TableCell><Badge variant="outline">{line.workType}</Badge></TableCell>
                                        <TableCell>{line.normalHours}</TableCell>
                                        <TableCell>{line.otHours}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {line.anomalies?.map(anomaly => (
                                                    <Badge key={anomaly} variant="destructive">{anomaly}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        {!isLocked && (
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(line)}>Edit</Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(line.id)}><Trash2 className="h-4 w-4"/></Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={isLocked ? 7 : 8} className="h-24 text-center">
                                        No lines have been added to this batch yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
             <LineForm batch={batch} open={isFormOpen} onOpenChange={setIsFormOpen} onSuccess={refetch} line={selectedLine} assignments={assignments || []} />
        </Card>
    );
}
