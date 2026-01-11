
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, writeBatch, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import FullPageLoader from '@/components/full-page-loader';
import { ShieldAlert, PlusCircle, MoreHorizontal, Lock, Trash2 } from 'lucide-react';
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
import { ensureStandardRolesSeeded } from '@/lib/roles-seed';
import { Separator } from '@/components/ui/separator';

export default function AdminRolesPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const seedCalledRef = useRef(false);

  const rolesQuery = useMemoFirebase(() => {
    if (!db || authLoading || !userProfile) return null;
    return query(collection(db, 'roles'), orderBy('isProtected', 'desc'), orderBy('department'), orderBy('level'));
  }, [db, authLoading, userProfile?.uid]);

  const { data: roles, isLoading: isLoadingRoles, refetch, error: rolesError } = useCollection<Role>(rolesQuery);

  useEffect(() => {
    if (db && userProfile?.isAdmin && !isLoadingRoles && roles && !seedCalledRef.current && !rolesError) {
        seedCalledRef.current = true;
        if (roles.length === 0) {
            ensureStandardRolesSeeded(db).then(() => {
                toast({ title: 'Standard Roles Seeded', description: 'Initial system roles have been created.' });
                refetch();
            });
        }
    }
  }, [db, userProfile, isLoadingRoles, roles, refetch, toast, rolesError]);

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
    if (!roleToDelete || !db || roleToDelete.isProtected) return;
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
  
  const standardRoles = roles?.filter(r => r.isProtected);
  const customRoles = roles?.filter(r => !r.isProtected);
  const isLoading = authLoading || (isLoadingRoles && !roles);

  if (isLoading) {
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
      
      {rolesError && (
        <Card className="bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2"><ShieldAlert/> Permission Error</CardTitle>
            <CardDescription className="text-destructive">Could not load roles. Please ensure you have the correct permissions and try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refetch}>Retry</Button>
            <p className="text-xs mt-2">{rolesError.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Standard Roles</CardTitle>
                <CardDescription>These roles are part of the core system and cannot be modified or deleted.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Role Code</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Description</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {isLoadingRoles ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                            ))
                        ) : standardRoles && standardRoles.length > 0 ? (
                            standardRoles.map(role => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium flex items-center gap-2"><Lock className="h-3 w-3 text-muted-foreground" />{role.name}</TableCell>
                                    <TableCell className="font-mono">{role.code}</TableCell>
                                    <TableCell><Badge variant="outline">{role.department}</Badge></TableCell>
                                    <TableCell>{role.description}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={4} className="h-24 text-center">Standard roles are being seeded...</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Custom Roles</CardTitle>
                <CardDescription>Roles created by administrators for specific needs.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Role Code</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                         {isLoadingRoles ? (
                            Array.from({ length: 1 }).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                            ))
                        ) : customRoles && customRoles.length > 0 ? (
                            customRoles.map(role => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium">{role.name}</TableCell>
                                    <TableCell className="font-mono">{role.code}</TableCell>
                                    <TableCell><Badge variant="secondary">{role.department}</Badge></TableCell>
                                    <TableCell>{role.description}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleEdit(role)}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" onClick={() => setRoleToDelete(role)}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                             <TableRow><TableCell colSpan={5} className="h-24 text-center">No custom roles have been created.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
      
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
