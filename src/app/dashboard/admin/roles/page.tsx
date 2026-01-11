

'use client';

import React, { useState, useMemo } from 'react';
import { collection, query, orderBy, doc, getDoc, getDocs, limit, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import FullPageLoader from '@/components/full-page-loader';
import { ShieldAlert, PlusCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import RoleForm from '@/components/forms/role-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


function RolesTable({ roles, onEdit, onDelete, canManage }: { roles: Role[] | null; onEdit: (role: Role) => void; onDelete: (role: Role) => void; canManage: boolean; }) {
    return (
        <Table>
            <TableHeader><TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Role Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Description</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
                {!roles ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={canManage ? 6 : 5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                    ))
                ) : roles.length > 0 ? (
                    roles.map(role => (
                        <TableRow key={role.id}>
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell className="font-mono">{role.code}</TableCell>
                            <TableCell><Badge variant="outline">{role.department}</Badge></TableCell>
                            <TableCell><Badge variant="secondary">{role.level}</Badge></TableCell>
                            <TableCell>{role.description}</TableCell>
                            {canManage && (
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => onEdit(role)}>Edit</DropdownMenuItem>
                                             <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className={role.code === 'ADMIN' ? 'relative' : ''}>
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => onDelete(role)}
                                                                disabled={role.code === 'ADMIN'}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </div>
                                                    </TooltipTrigger>
                                                    {role.code === 'ADMIN' && (
                                                        <TooltipContent>
                                                            <p>The ADMIN role cannot be deleted.</p>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </TooltipProvider>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            )}
                        </TableRow>
                    ))
                ) : (
                    <TableRow><TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center">No roles found.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    );
}

export default function AdminRolesPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const rolesQuery = useMemoFirebase(() => {
    if (!db || authLoading || !userProfile) return null;
    return query(collection(db, 'roles'), orderBy('department'), orderBy('code'));
  }, [db, authLoading, userProfile]);

  const { data: roles, isLoading: isLoadingRoles, refetch, error: rolesError } = useCollection<Role>(rolesQuery);

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
    if (!roleToDelete || !db || !isAdmin) return;
    if (roleToDelete.code === 'ADMIN') {
        toast({ variant: 'destructive', title: "Action Forbidden", description: "The ADMIN role cannot be deleted."});
        return;
    }

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
  
  const handleTestAccess = async () => {
      if (!db) return;
      let results: string[] = [];
      try {
        await getDoc(doc(db, 'roles', 'ADMIN'));
        results.push('GET OK');
      } catch (e) {
        results.push('GET DENIED');
      }
      try {
        await getDocs(query(collection(db, 'roles'), limit(1)));
        results.push('LIST OK');
      } catch (e) {
        results.push('LIST DENIED');
      }
      setTestResult(results.join(' / '));
  }

  const isLoading = authLoading || (isLoadingRoles && !roles);

  if (isLoading && !rolesError) {
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
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleTestAccess}>Test Roles Access</Button>
            <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Create Role</Button>
        </div>
      </div>

       {testResult && <p className="text-sm text-muted-foreground">Test Result: {testResult}</p>}
      
      {rolesError && (
        <Card className="bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2"><ShieldAlert/> Permission Error</CardTitle>
            <CardDescription className="text-destructive">Could not load roles. This might be a temporary permission issue or misconfigured Firestore rules.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refetch}>Retry</Button>
            <p className="text-xs mt-2">{rolesError.message}</p>
          </CardContent>
        </Card>
      )}

      {!rolesError && (
        <Card>
            <CardHeader>
                <CardTitle>All Roles</CardTitle>
                <CardDescription>System and custom roles available in the application.</CardDescription>
            </CardHeader>
            <CardContent>
                <RolesTable roles={roles} onEdit={handleEdit} onDelete={setRoleToDelete} canManage={isAdmin} />
            </CardContent>
        </Card>
      )}
      
      {isFormOpen && (
        <RoleForm open={isFormOpen} onOpenChange={setIsFormOpen} role={selectedRole} onSuccess={refetch} />
      )}

      {roleToDelete && (
        <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the role "{roleToDelete.name}". This action cannot be undone.
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
