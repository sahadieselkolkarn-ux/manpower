

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  setDoc,
  doc,
  serverTimestamp,
  updateDoc,
  getDoc,
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
import { Department, Role, RoleLevel } from '@/types/user';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';

const formSchema = z.object({
  name: z.string().min(2, 'Role name is required.'),
  code: z.string().min(2, 'Role code is required (e.g., CUSTOM_ROLE).').transform(val => val.trim().toUpperCase().replace(/\s+/g, '_')),
  department: z.custom<Department>(),
  level: z.custom<RoleLevel>(),
  description: z.string().optional(),
  isSystem: z.boolean(),
});

interface RoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role | null;
  onSuccess: () => void;
}

export default function RoleForm({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleFormProps) {
  const [loading, setLoading] = React.useState(false);
  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      department: 'CUSTOM',
      level: 'CUSTOM',
      description: '',
      isSystem: false,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (role) {
        form.reset({
          name: role.name || '',
          code: role.code || '',
          department: role.department || 'CUSTOM',
          level: role.level || 'CUSTOM',
          description: role.description || '',
          isSystem: role.isSystem || false,
        });
      } else {
        form.reset({
          name: '',
          code: '',
          department: 'CUSTOM',
          level: 'CUSTOM',
          description: '',
          isSystem: false,
        });
      }
    }
  }, [open, role, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db) return;
    setLoading(true);

    try {
      if (role) {
        // Update existing role
        const roleRef = doc(db, 'roles', role.id);
        await updateDoc(roleRef, {
          name: values.name,
          department: values.department,
          level: values.level,
          description: values.description,
          isSystem: values.isSystem,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Role updated.' });
      } else {
        // Create new role
        const roleRef = doc(db, 'roles', values.code);
        const docSnap = await getDoc(roleRef);
        if (docSnap.exists()) {
            form.setError('code', { message: 'This role code already exists.' });
            setLoading(false);
            return;
        }

        await setDoc(roleRef, {
          ...values,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'New role created.' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not save the role.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Create Role'}</DialogTitle>
          <DialogDescription>
            Define the details for this role. The Role Code will be used as the ID and cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Document Controller" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., DOC_CONTROLLER" {...field} disabled={!!role}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="OPERATION">OPERATION</SelectItem>
                        <SelectItem value="FINANCE">FINANCE</SelectItem>
                        <SelectItem value="MANAGEMENT">MANAGEMENT</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                        <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                        <SelectItem value="OFFICER">OFFICER</SelectItem>
                        <SelectItem value="MANAGER">MANAGER</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Briefly describe the role's purpose." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="isSystem"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Is System Role?</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
