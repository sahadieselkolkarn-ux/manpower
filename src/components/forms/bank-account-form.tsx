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
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BankAccount, BankAccountType } from '@/types/bank-account';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const formSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required.'),
  accountName: z.string().min(2, 'Account name is required.'),
  accountNo: z.string().min(1, 'Account number is required.'),
  accountType: z.custom<BankAccountType>(),
  currency: z.string().min(3, 'Currency code is required (e.g., USD, THB)').max(3),
  openingBalance: z.coerce.number(),
  active: z.boolean(),
  note: z.string().optional(),
});

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount | null;
  onSuccess?: () => void;
}

export default function BankAccountForm({
  open,
  onOpenChange,
  account,
  onSuccess,
}: BankAccountFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // In a real app, you'd check if there are movements for this account
  const hasMovements = false; 

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        bankName: '',
        accountName: '',
        accountNo: '',
        accountType: 'current',
        currency: 'USD',
        openingBalance: 0,
        active: true,
        note: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      if (account) {
        form.reset({
          ...account,
          currency: account.currency || 'USD',
        });
      } else {
        form.reset({
            bankName: '',
            accountName: '',
            accountNo: '',
            accountType: 'current',
            currency: 'USD',
            openingBalance: 0,
            active: true,
            note: '',
        });
      }
    }
  }, [open, account, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setLoading(true);

    try {
      if (account) {
        // Update existing account
        const accountRef = doc(db, 'bankAccounts', account.id);
        await updateDoc(accountRef, {
          ...values,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Bank account updated successfully.',
        });
      } else {
        // Create new account
        await addDoc(collection(db, 'bankAccounts'), {
          ...values,
          createdBy: userProfile.displayName || userProfile.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Bank account created successfully.',
        });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving bank account:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description:
          'There was a problem with your request. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Account' : 'Add New Bank Account'}</DialogTitle>
          <DialogDescription>
            {account
              ? "Update the account's details below."
              : 'Enter the new account details.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name / Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., KBank Operating Account" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Kasikornbank, Cash" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                control={form.control}
                name="accountNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="123-4-56789-0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an account type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="current">Current</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., THB" {...field} maxLength={3} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
              <FormField
                control={form.control}
                name="openingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={!!account && hasMovements}/>
                    </FormControl>
                     {!!account && hasMovements && <FormMessage>Cannot edit opening balance after movements exist.</FormMessage>}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional notes about this account." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>Active Account</FormLabel>
                            <FormDescription>
                                Inactive accounts will not appear in selection lists.
                            </FormDescription>
                        </div>
                         <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />


            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Account'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
