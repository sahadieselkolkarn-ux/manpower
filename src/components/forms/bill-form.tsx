
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BillAP } from '@/types/ap-bill';
import { Textarea } from '../ui/textarea';
import { toDate, DATE_FORMAT, formatDate } from '@/lib/utils';


const dateSchema = (required = true) => z.preprocess((arg) => {
    if (typeof arg === 'string' && arg) {
        try {
            const parsed = parse(arg, DATE_FORMAT, new Date());
            if (isValid(parsed)) return parsed;
        } catch (e) {}
    }
    return arg;
}, required ? z.date({ required_error: 'Date is required.'}) : z.date().optional());

const formSchema = z.object({
  vendorName: z.string().min(1, 'Vendor name is required.'),
  billNo: z.string().optional(),
  billDate: dateSchema(),
  dueDate: dateSchema(false),
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
  currency: z.string().optional(),
  category: z.string().min(1, 'Category is required.'),
  note: z.string().optional(),
});

interface BillFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: BillAP | null;
  onSuccess?: () => void;
}

export default function BillForm({
  open,
  onOpenChange,
  bill,
  onSuccess,
}: BillFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorName: '',
      billNo: '',
      billDate: new Date(),
      dueDate: undefined,
      amount: 0,
      currency: 'USD',
      category: 'misc',
      note: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      if (bill) {
        form.reset({
          vendorName: bill.vendorName,
          billNo: bill.billNo || '',
          billDate: toDate(bill.billDate) || new Date(),
          dueDate: toDate(bill.dueDate),
          amount: bill.amount,
          currency: bill.currency || 'USD',
          category: bill.category,
          note: bill.note || '',
        });
      } else {
        form.reset({
          vendorName: '',
          billNo: '',
          billDate: new Date(),
          dueDate: undefined,
          amount: 0,
          currency: 'USD',
          category: 'misc',
          note: '',
        });
      }
    }
  }, [open, bill, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db) return;

    setLoading(true);
    const dataToSave = {
      ...values,
      billDate: Timestamp.fromDate(values.billDate),
      dueDate: values.dueDate ? Timestamp.fromDate(values.dueDate) : null,
      updatedAt: serverTimestamp(),
    };

    try {
      if (bill) {
        // Update existing bill
        const billRef = doc(db, 'billsAP', bill.id);
        await updateDoc(billRef, dataToSave);
        toast({ title: 'Success', description: 'Bill updated successfully.' });
      } else {
        // Create new bill
        await addDoc(collection(db, 'billsAP'), {
          ...dataToSave,
          status: 'DRAFT',
          paidAmount: 0,
          createdAt: serverTimestamp(),
          createdBy: userProfile.displayName || 'DEV',
        });
        toast({ title: 'Success', description: 'Bill created successfully.' });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving bill:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'There was a problem saving the bill.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const isPaidOrVoid = bill?.status === 'PAID' || bill?.status === 'VOID';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bill ? 'Edit Bill' : 'Create New Bill'}</DialogTitle>
          <DialogDescription>
            {isPaidOrVoid ? 'This bill cannot be edited.' : 'Fill in the details for the bill or expense.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <FormField control={form.control} name="vendorName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Office Supply Inc." {...field} disabled={isPaidOrVoid} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
             <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="billDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Date</FormLabel>
                  <FormControl>
                    <Input placeholder={DATE_FORMAT} {...field} value={formatDate(field.value) || ''}  disabled={isPaidOrVoid}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder={DATE_FORMAT} {...field} value={formatDate(field.value) || ''} disabled={isPaidOrVoid}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
             </div>
             <FormField control={form.control} name="billNo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill No. (Optional)</FormLabel>
                  <FormControl><Input placeholder="Invoice number from vendor" {...field} disabled={isPaidOrVoid}/></FormControl>
                  <FormMessage />
                </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl><Input type="number" placeholder="0.00" {...field} disabled={isPaidOrVoid}/></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl><Input placeholder="USD" {...field} disabled={isPaidOrVoid} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>

             <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPaidOrVoid}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="misc">Miscellaneous</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
            )} />
            
             <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Internal notes" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              {!isPaidOrVoid && <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Bill'}</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
