
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, doc, serverTimestamp, updateDoc, runTransaction } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { type ContractWithClient } from '@/types/contract';
import { type ProjectWithContract } from '@/types/project';
import { normalizeKey } from '@/lib/normalize';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Project name must be at least 2 characters.',
  }),
  workMode: z.enum(['Onshore', 'Offshore'], {
    required_error: 'Work mode is required.'
  }),
  contractId: z.string().min(1, { message: "Please select a contract." }),
});

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectWithContract | null;
  contracts: ContractWithClient[];
  onSuccess?: () => void;
}

export default function ProjectForm({ open, onOpenChange, project, contracts, onSuccess }: ProjectFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      workMode: 'Onshore',
      contractId: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }
    setLoading(true);

    const nameKey = normalizeKey(values.name);
    const oldNameKey = project ? normalizeKey(project.name) : null;
    const selectedContract = contracts.find(c => c.id === values.contractId);

    if (!selectedContract) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected contract not found.' });
      setLoading(false);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        // --- Uniqueness Check ---
        if (nameKey !== oldNameKey) {
          const uniqueKey = `${selectedContract.clientId}_${selectedContract.id}_${nameKey}`;
          const uniqueRef = doc(db, 'unique/projectNames', uniqueKey);
          const uniqueDoc = await transaction.get(uniqueRef);
          if (uniqueDoc.exists()) {
            throw new Error(`Project name "${values.name}" already exists in this contract.`);
          }
        }

        if (project) { // --- Update ---
          const projectRef = doc(db, `clients/${project.clientId}/contracts/${project.contractId}/projects`, project.id);
          transaction.update(projectRef, {
            name: values.name,
            nameKey: nameKey,
            workMode: values.workMode,
            updatedAt: serverTimestamp(),
          });

          if (nameKey !== oldNameKey) {
            const newUniqueKey = `${project.clientId}_${project.contractId}_${nameKey}`;
            const oldUniqueKey = `${project.clientId}_${project.contractId}_${oldNameKey}`;
            transaction.set(doc(db, 'unique/projectNames', newUniqueKey), { entityId: project.id });
            if (oldNameKey) {
              transaction.delete(doc(db, 'unique/projectNames', oldUniqueKey));
            }
          }
        } else { // --- Create ---
          // 1. Get Counter for Project Code
          const now = new Date();
          const beYear = now.getFullYear() + 543;
          const yy = String(beYear).slice(-2);
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const YYMM = `${yy}${mm}`;
          
          const counterRef = doc(db, 'counters/projectCodes', YYMM);
          const counterDoc = await transaction.get(counterRef);
          const seq = counterDoc.data()?.next ?? 1;
          const projectCode = `P${YYMM}${String(seq).padStart(3, '0')}`;
          
          // 2. Check Project Code Uniqueness
          const codeUniqueRef = doc(db, 'unique/projectCodes', projectCode);
          const codeUniqueDoc = await transaction.get(codeUniqueRef);
          if(codeUniqueDoc.exists()) {
              throw new Error(`Generated project code ${projectCode} already exists. Please try again.`);
          }

          // 3. Create Project Document
          const projectCollectionPath = `clients/${selectedContract.clientId}/contracts/${values.contractId}/projects`;
          const newProjectRef = doc(collection(db, projectCollectionPath));
          transaction.set(newProjectRef, {
            name: values.name,
            nameKey,
            projectCode,
            workMode: values.workMode,
            status: 'active',
            isDeleted: false,
            createdBy: userProfile.displayName || userProfile.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          
          // 4. Update/Set Indexes
          transaction.set(codeUniqueRef, { entityId: newProjectRef.id });
          const uniqueKey = `${selectedContract.clientId}_${selectedContract.id}_${nameKey}`;
          transaction.set(doc(db, 'unique/projectNames', uniqueKey), { entityId: newProjectRef.id });
          transaction.set(counterRef, { next: seq + 1 }, { merge: true });
        }
      });
      
      toast({ title: 'Success', description: `Project ${project ? 'updated' : 'created'} successfully.` });
      onSuccess?.();
      onOpenChange(false);
      form.reset();

    } catch (error) {
      console.error('Error saving project:', error);
      const errorMessage = error instanceof Error ? error.message : 'There was a problem with your request.';
      if (errorMessage.includes('already exists')) {
          form.setError('name', { message: errorMessage });
      } else {
        toast({ variant: 'destructive', title: 'Uh oh! Something went wrong.', description: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };


  React.useEffect(() => {
    if (open) {
      form.reset({
        name: project?.name || '',
        workMode: project?.workMode || 'Onshore',
        contractId: project?.contractId || '',
      });
    }
  }, [open, project, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          <DialogDescription>
            {project ? "Update the project's details below." : 'Enter the new project details below.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Platform Alpha Maintenance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!project}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contract" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.name} ({contract.clientName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Mode</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Onshore">Onshore</SelectItem>
                      <SelectItem value="Offshore">Offshore</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
