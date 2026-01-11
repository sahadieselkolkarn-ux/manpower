'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import FullPageLoader from '@/components/full-page-loader';
import { ShieldAlert, PlusCircle, MoreHorizontal, Lock, Trash2 } from 'lucide-react';
import { ROLES_SEED_DATA } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import RoleForm from '@/components/forms/role-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminRolesPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const rolesQuery = useMemoFirebase(() => (db ? query(collection(db, 'roles'), orderBy('isSystem', 'desc'), orderBy('department'), orderBy('level')) : null), [db]);
  const { data: roles, isLoading: isLoadingRoles, refetch } = useCollection<Role>(rolesQuery);

  // Auto-seed initial roles if the collection is empty
  useEffect(() => {
    if (!db || isLoadingRoles || roles === null) return;
    if (roles.length === 0) {
      console.log('Roles collection is empty. Seeding standard roles...');
      const seedRoles = async () => {
        const batch = writeBatch(db);
        ROLES_SEED_DATA.forEach(roleData => {
          const roleRef = doc(collection(db, 'roles'));
          batch.set(roleRef, roleData);
        });
        await batch.commit();
        toast({ title: 'System Roles Seeded', description: 'Standard roles have been added to the database.' });
        refetch();
      };
      seedRoles().catch(console.error);
    }
  }, [db, roles, isLoadingRoles, refetch, toast]);

  const isAdmin = userProfile?.isAdmin;

  const handleCreate = () => {
    setSelectedRole(null);
    setIsFormOpen(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!roleToDelete || !db || roleToDelete.isSystem) return;
    try {
        await deleteDoc(doc(db, 'roles', roleToDelete.id));
        toast({ title: "Success", description: `Role "${roleToDelete.name}" has been deleted.` });
        refetch();
    } catch (error) {
        console.error("Error deleting role:", error);
        toast({ variant: 'destructive', title: "Error", description: "Failed to delete role."});
    } finally {
        setRoleToDelete(null);
    }
  }


  if (authLoading || isLoadingRoles) {
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">System Roles</h1>
          <p className="text-muted-foreground">Master list of all functional roles in the application.</p>
        </div>
        <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Create Custom Role</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Role Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRoles ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                  </TableRow>
                ))
              ) : roles && roles.length > 0 ? (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        {role.isSystem && <Lock className="h-3 w-3 text-muted-foreground" title="Standard System Role"/>}
                        {role.name}
                    </TableCell>
                    <TableCell className="font-mono">{role.code}</TableCell>
                    <TableCell><Badge variant="outline">{role.department}</Badge></TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEdit(role)}>
                                    {role.isSystem ? 'View' : 'Edit'}
                                </DropdownMenuItem>
                                {!role.isSystem && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => setRoleToDelete(role)}>
                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">No roles found. Seeding initial data...</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {isFormOpen && (
        <RoleForm open={isFormOpen} onOpenChange={setIsFormOpen} role={selectedRole} onSuccess={refetch} />
      )}

      {roleToDelete && (
        <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the custom role "{roleToDelete.name}". This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete Role</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
