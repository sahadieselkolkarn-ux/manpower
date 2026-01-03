'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to perform this action.',
      });
      return;
    }

    setLoading(true);

    try {
      const { contractId, ...projectData } = values;

      const selectedContract = contracts.find(c => c.id === contractId);
      if (!selectedContract) {
          throw new Error("Selected contract not found");
      }
      
      const projectCollectionPath = `clients/${selectedContract.clientId}/contracts/${contractId}/projects`;

      if (project) {
        // Update existing project
        const projectRef = doc(db, `clients/${project.clientId}/contracts/${project.contractId}/projects`, project.id);
        await updateDoc(projectRef, {
            ...projectData,
            updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Project updated successfully.',
        });
      } else {
        // Create new project
        const collectionRef = collection(db, projectCollectionPath);
        await addDoc(collectionRef, {
            ...projectData,
            status: 'active',
            createdBy: userProfile.displayName || userProfile.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Project created successfully.',
        });
      }
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem with your request. Please try again.',
      });
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
