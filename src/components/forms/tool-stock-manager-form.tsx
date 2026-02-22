
'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  doc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { Tool } from '@/types/tool';
import { Employee } from '@/types/employee';
import { ManpowerPosition } from '@/types/position';
import { ToolAssignment } from '@/types/tool-assignment';
import { checkoutTool, addToolStock, returnToolStock } from '@/lib/firestore/tool-stock.service';

// Schemas
const checkoutSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee.'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
  notes: z.string().optional(),
});

const addStockSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
  reason: z.string().min(1, 'A reason is required (e.g., "New Purchase").'),
});

const returnStockSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
  notes: z.string().optional(),
});

// Props
interface ToolStockManagerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: Tool | null;
  onSuccess: () => void;
}

export default function ToolStockManagerForm({ open, onOpenChange, tool, onSuccess }: ToolStockManagerFormProps) {
  const [loading, setLoading] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // Data fetching
  const { data: positions } = useCollection<ManpowerPosition>(useMemoFirebase(() => db ? collection(db, 'manpowerPositions') : null, [db]));
  const { data: employees } = useCollection<Employee>(useMemoFirebase(() => db ? query(collection(db, 'employees'), where('employeeType', '==', 'FIELD'), where('employmentStatus', '==', 'Active')) : null, [db]));
  const { data: assignments } = useCollection<ToolAssignment>(useMemoFirebase(() => db && tool ? query(collection(db, 'toolAssignments'), where('toolId', '==', tool.id)) : null, [db, tool]));

  // Memoized data
  const eligibleEmployees = useMemo(() => {
    if (!employees || !positions || !tool) return [];
    const requiredByPositionIds = new Set(positions.filter(p => p.requiredToolIds?.includes(tool.id)).map(p => p.id));
    return employees.filter(emp => emp.positionIds.some(posId => requiredByPositionIds.has(posId)));
  }, [employees, positions, tool]);
  
  const assignmentsByEmployee = useMemo(() => {
      const map = new Map<string, number>();
      if (!assignments) return map;
      assignments.forEach(a => {
          map.set(a.employeeId, (map.get(a.employeeId) || 0) + a.quantity);
      });
      return map;
  }, [assignments]);


  // Forms
  const checkoutForm = useForm<z.infer<typeof checkoutSchema>>({ resolver: zodResolver(checkoutSchema), defaultValues: { employeeId: '', quantity: 1, notes: '' } });
  const addStockForm = useForm<z.infer<typeof addStockSchema>>({ resolver: zodResolver(addStockSchema), defaultValues: { quantity: 1, reason: '' } });
  const returnStockForm = useForm<z.infer<typeof returnStockSchema>>({ resolver: zodResolver(returnStockSchema), defaultValues: { quantity: 1, notes: '' } });

  const selectedEmployeeId = checkoutForm.watch('employeeId');
  const hasExistingCheckout = selectedEmployeeId && assignmentsByEmployee.has(selectedEmployeeId);

  // Handlers
  const handleFinalCheckout = async (values: z.infer<typeof checkoutSchema>) => {
    if (!userProfile || !db || !tool) return;
    const selectedEmployee = eligibleEmployees.find(e => e.id === values.employeeId);
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      await checkoutTool(db, userProfile, tool, selectedEmployee, values.quantity, values.notes);
      toast({ title: 'Success!', description: `${values.quantity} unit(s) of ${tool.name} checked out to ${selectedEmployee.personalInfo.firstName}.` });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Checkout Failed', description: error.message });
    } finally {
      setLoading(false);
      setConfirmCheckout(false);
    }
  };

  const onCheckoutSubmit = async (values: z.infer<typeof checkoutSchema>) => {
    if (hasExistingCheckout) {
      setConfirmCheckout(true); // Trigger confirmation dialog
    } else {
      await handleFinalCheckout(values);
    }
  };
  
  const onAddStockSubmit = async (values: z.infer<typeof addStockSchema>) => {
    if (!userProfile || !db || !tool) return;
    setLoading(true);
    try {
        await addToolStock(db, userProfile, tool, values.quantity, values.reason);
        toast({ title: "Success", description: `${values.quantity} unit(s) added to ${tool.name} stock.`});
        onSuccess();
        onOpenChange(false);
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setLoading(false);
    }
  }
  
  const onReturnStockSubmit = async (values: z.infer<typeof returnStockSchema>) => {
    if (!userProfile || !db || !tool) return;
    setLoading(true);
    try {
        await returnToolStock(db, userProfile, tool, values.quantity, values.notes || 'Employee return');
        toast({ title: "Success", description: `${values.quantity} unit(s) of ${tool.name} returned to stock.`});
        onSuccess();
        onOpenChange(false);
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setLoading(false);
    }
  }

  // Reset forms on dialog close/open
  React.useEffect(() => {
    if (open) {
      checkoutForm.reset();
      addStockForm.reset();
      returnStockForm.reset();
    }
  }, [open, checkoutForm, addStockForm, returnStockForm]);
  

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Stock for: {tool?.name}</DialogTitle>
          <DialogDescription>
            Available: <span className="font-bold text-green-600">{tool?.availableQuantity}</span> / 
            Assigned: <span className="font-bold text-yellow-600">{tool?.assignedQuantity}</span> / 
            Total: <span className="font-bold">{tool?.totalQuantity}</span>
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="checkout">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="checkout">Check Out</TabsTrigger>
            <TabsTrigger value="return">Return</TabsTrigger>
            <TabsTrigger value="add">Add Stock</TabsTrigger>
          </TabsList>
          
          <TabsContent value="checkout">
            <Form {...checkoutForm}>
                <form onSubmit={checkoutForm.handleSubmit(onCheckoutSubmit)} className="space-y-4 pt-4">
                     <FormField control={checkoutForm.control} name="employeeId" render={({ field }) => (
                          <FormItem><FormLabel>Eligible Employee</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select an employee..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {eligibleEmployees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.personalInfo.firstName} {emp.personalInfo.lastName} ({emp.employeeCode})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                          <FormMessage /></FormItem>
                      )} />
                    {hasExistingCheckout && <p className="text-sm text-amber-600">This employee has already checked out {assignmentsByEmployee.get(selectedEmployeeId)} unit(s) of this tool.</p>}
                     <FormField control={checkoutForm.control} name="quantity" render={({ field }) => (
                          <FormItem><FormLabel>Quantity to Check Out</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    <FormField control={checkoutForm.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Reason for checkout, etc." {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Check Out'}</Button>
                    </DialogFooter>
                </form>
            </Form>
          </TabsContent>

          <TabsContent value="return">
            <Form {...returnStockForm}>
                 <form onSubmit={returnStockForm.handleSubmit(onReturnStockSubmit)} className="space-y-4 pt-4">
                     <FormField control={returnStockForm.control} name="quantity" render={({ field }) => (
                        <FormItem><FormLabel>Quantity to Return</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={returnStockForm.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Returned from Wave WV-2401-001" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Return to Stock'}</Button>
                    </DialogFooter>
                </form>
            </Form>
          </TabsContent>

          <TabsContent value="add">
            <Form {...addStockForm}>
                 <form onSubmit={addStockForm.handleSubmit(onAddStockSubmit)} className="space-y-4 pt-4">
                     <FormField control={addStockForm.control} name="quantity" render={({ field }) => (
                        <FormItem><FormLabel>Quantity to Add</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={addStockForm.control} name="reason" render={({ field }) => (
                        <FormItem><FormLabel>Reason</FormLabel><FormControl><Input placeholder="e.g., New purchase, Stock correction" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Add to Inventory'}</Button>
                    </DialogFooter>
                </form>
            </Form>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmCheckout} onOpenChange={setConfirmCheckout}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Checkout</AlertDialogTitle>
                <AlertDialogDescription>This employee already has this tool checked out. Do you want to check out additional items?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmCheckout(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleFinalCheckout(checkoutForm.getValues())}>Yes, Check Out More</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
