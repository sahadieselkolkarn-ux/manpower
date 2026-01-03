
'use client';

import React, { useState, useMemo } from 'react';
import { collection, query, where, doc, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { TimesheetBatch, TimesheetLine } from '@/types/timesheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parse, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  employeeId: z.string().min(1, 'Employee ID is required'),
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


function LineForm({ batch, open, onOpenChange, onSuccess, line }: { batch: TimesheetBatch, open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void, line?: TimesheetLine | null }) {
    const [loading, setLoading] = useState(false);
    const db = useFirestore();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof lineFormSchema>>({
        resolver: zodResolver(lineFormSchema),
        defaultValues: {
            employeeId: '',
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
              employeeId: '',
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

        const batchRef = doc(db, 'timesheetBatches', batch.id);
        const lineRef = line ? doc(db, 'timesheetLines', line.id) : doc(collection(db, 'timesheetLines'));

        const data = {
            ...values,
            batchId: batch.id,
            workDate: Timestamp.fromDate(values.workDate),
            updatedAt: serverTimestamp(),
        };

        const batchUpdateData = {
            status: 'CLIENT_APPROVED_RECEIVED' as const, // Revert status if validated
            updatedAt: serverTimestamp(),
        };

        try {
            const batch = writeBatch(db);
            if (line) {
                batch.update(lineRef, data);
            } else {
                batch.set(lineRef, { ...data, createdAt: serverTimestamp() });
            }
            batch.update(batchRef, batchUpdateData);

            await batch.commit();

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
                        <FormField control={form.control} name="employeeId" render={({ field }) => (
                            <FormItem><FormLabel>Employee ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
    
    const sortedLines = useMemo(() => {
        if (!lines) return [];
        return [...lines].sort((a, b) => a.workDate.toMillis() - b.workDate.toMillis() || a.employeeId.localeCompare(b.employeeId));
    }, [lines]);

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
            const batchOp = writeBatch(db);
            batchOp.delete(lineRef);
            batchOp.update(batchRef, { status: 'CLIENT_APPROVED_RECEIVED', updatedAt: serverTimestamp() });
            await batchOp.commit();

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
                        <CardDescription>Enter or edit the work hours for this batch.</CardDescription>
                    </div>
                    {!isLocked && (
                        <Button onClick={handleAdd}><PlusCircle className="mr-2 h-4 w-4"/>Add Line</Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Work Date</TableHead>
                            <TableHead>Employee ID</TableHead>
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
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    {!isLocked && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                                </TableRow>
                            ))
                        ) : sortedLines && sortedLines.length > 0 ? (
                            sortedLines.map(line => (
                                <TableRow key={line.id} className={line.anomalies && line.anomalies.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                                    <TableCell>{line.workDate.toDate().toLocaleDateString()}</TableCell>
                                    <TableCell className="font-mono">{line.employeeId}</TableCell>
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
                                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(line.id)}><Trash2 className="h-4 w-4"/></Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={isLocked ? 6 : 7} className="h-24 text-center">
                                    No lines have been added to this batch yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
             <LineForm batch={batch} open={isFormOpen} onOpenChange={setIsFormOpen} onSuccess={refetch} line={selectedLine} />
        </Card>
    );
}
