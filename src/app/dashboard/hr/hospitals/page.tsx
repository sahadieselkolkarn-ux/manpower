
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Hospital as HospitalIcon, ShieldAlert } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import FullPageLoader from '@/components/full-page-loader';
import { Hospital } from '@/types/hospital';


const formSchema = z.object({
  name: z.string().min(2, 'Hospital name is required.'),
  address: z.string().optional(),
  emergencyPhone: z.string().optional(),
  note: z.string().optional(),
});

interface HospitalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospital?: Hospital | null;
  onSuccess: () => void;
}

function HospitalForm({ open, onOpenChange, hospital, onSuccess }: HospitalFormProps) {
  const [loading, setLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', address: '', emergencyPhone: '', note: '' },
  });

  React.useEffect(() => {
    if (open) {
      form.reset(hospital || { name: '', address: '', emergencyPhone: '', note: '' });
    }
  }, [open, hospital, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db) return;
    setLoading(true);
    try {
      if (hospital) {
        await updateDoc(doc(db, 'hospitals', hospital.id), { ...values, updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Hospital updated.' });
      } else {
        await addDoc(collection(db, 'hospitals'), { ...values, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Hospital created.' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving hospital:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save hospital.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hospital ? 'Edit' : 'Create'} Hospital</DialogTitle>
          <DialogDescription>Manage hospital information for Social Security records.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Hospital Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="emergencyPhone" render={({ field }) => (
              <FormItem><FormLabel>Emergency Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Note</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function HospitalsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();

  const hospitalsQuery = useMemoFirebase(() => (db ? collection(db, 'hospitals') : null), [db]);
  const { data: hospitals, isLoading, refetch } = useCollection<Hospital>(hospitalsQuery);

  const canManage = userProfile?.role === 'admin' || userProfile?.role === 'hrManager';

  const handleCreate = () => {
    setSelectedHospital(null);
    setIsFormOpen(true);
  };

  const handleEdit = (h: Hospital) => {
    setSelectedHospital(h);
    setIsFormOpen(true);
  };

  if (authLoading || isLoading) {
    return <FullPageLoader />;
  }

  if (!canManage) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to view this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Hospitals</h1>
          <p className="text-muted-foreground">Manage Social Security hospitals.</p>
        </div>
        <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Create Hospital</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Emergency Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : hospitals && hospitals.length > 0 ? (
                hospitals.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>{h.address}</TableCell>
                    <TableCell>{h.emergencyPhone}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(h)}>Edit</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">No hospitals found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <HospitalForm open={isFormOpen} onOpenChange={setIsFormOpen} hospital={selectedHospital} onSuccess={refetch} />
    </div>
  );
}

    