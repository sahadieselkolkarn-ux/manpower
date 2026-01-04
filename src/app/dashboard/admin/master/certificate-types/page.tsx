'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, ShieldAlert } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import FullPageLoader from '@/components/full-page-loader';
import { CertificateType, CertificateCategory } from '@/types/certificate-type';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formSchema = z.object({
  code: z.string().min(1, 'Code is required.'),
  name: z.string().min(2, 'Name is required.'),
  type: z.custom<CertificateCategory>(),
  requiresExpiry: z.boolean(),
  note: z.string().optional(),
});

interface CertificateTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certType?: CertificateType | null;
  onSuccess: () => void;
}

function CertificateTypeForm({ open, onOpenChange, certType, onSuccess }: CertificateTypeFormProps) {
  const [loading, setLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '', name: '', type: 'GENERAL', requiresExpiry: true, note: '' },
  });

  React.useEffect(() => {
    if (open) {
      form.reset(certType ? { ...certType } : { code: '', name: '', type: 'GENERAL', requiresExpiry: true, note: '' });
    }
  }, [open, certType, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db) return;
    setLoading(true);

    try {
      if (!certType) {
        const q = query(collection(db, 'certificateTypes'), where('code', '==', values.code));
        const existing = await getDocs(q);
        if (!existing.empty) {
          form.setError('code', { message: 'This code is already in use.' });
          setLoading(false);
          return;
        }
      }

      if (certType) {
        await updateDoc(doc(db, 'certificateTypes', certType.id), { ...values, updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Certificate type updated.' });
      } else {
        await addDoc(collection(db, 'certificateTypes'), {
          ...values,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Certificate type created.' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving certificate type:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save certificate type.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{certType ? 'Edit' : 'Create'} Certificate Type</DialogTitle>
          <DialogDescription>Manage a reusable certificate definition.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} disabled={!!certType} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                    <FormLabel>Certificate Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="GENERAL">GENERAL</SelectItem>
                            <SelectItem value="FIELD">FIELD</SelectItem>
                            <SelectItem value="OFFICE">OFFICE</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem><FormLabel>Note</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="requiresExpiry" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><div className="space-y-0.5"><FormLabel>Requires Expiry Date?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
            )}/>
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

function CertificateTypesTable({ types, onEdit }: { types: CertificateType[] | null; onEdit: (ct: CertificateType) => void; }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Requires Expiry</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!types ? (
          Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : types.length > 0 ? (
          types.map((ct) => (
            <TableRow key={ct.id}>
              <TableCell className="font-mono">{ct.code}</TableCell>
              <TableCell>{ct.name}</TableCell>
              <TableCell><Badge variant="secondary">{ct.type}</Badge></TableCell>
              <TableCell>{ct.requiresExpiry ? 'Yes' : 'No'}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(ct)}>Edit</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow><TableCell colSpan={5} className="h-24 text-center">No certificate types found in this category.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export default function CertificateTypesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCertType, setSelectedCertType] = useState<CertificateType | null>(null);

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();

  const certTypesQuery = useMemoFirebase(() => (db ? collection(db, 'certificateTypes') : null), [db]);
  const { data: certTypes, isLoading, refetch } = useCollection<CertificateType>(certTypesQuery);

  const isAdmin = userProfile?.isAdmin;

  const handleCreate = () => {
    setSelectedCertType(null);
    setIsFormOpen(true);
  };

  const handleEdit = (ct: CertificateType) => {
    setSelectedCertType(ct);
    setIsFormOpen(true);
  };

  if (authLoading || isLoading) {
    return <FullPageLoader />;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to view this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  const fieldTypes = certTypes?.filter(ct => ct.type === 'FIELD') || null;
  const officeTypes = certTypes?.filter(ct => ct.type === 'OFFICE') || null;
  const generalTypes = certTypes?.filter(ct => ct.type === 'GENERAL') || null;


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Certificate Types</h1>
          <p className="text-muted-foreground">Manage system-wide certificate types.</p>
        </div>
        <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Create Type</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="field">
            <TabsList>
              <TabsTrigger value="field">Field</TabsTrigger>
              <TabsTrigger value="office">Office</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
            </TabsList>
            <TabsContent value="field" className="mt-4">
              <CertificateTypesTable types={fieldTypes} onEdit={handleEdit} />
            </TabsContent>
             <TabsContent value="office" className="mt-4">
              <CertificateTypesTable types={officeTypes} onEdit={handleEdit} />
            </TabsContent>
             <TabsContent value="general" className="mt-4">
              <CertificateTypesTable types={generalTypes} onEdit={handleEdit} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <CertificateTypeForm open={isFormOpen} onOpenChange={setIsFormOpen} certType={selectedCertType} onSuccess={refetch} />
    </div>
  );
}
