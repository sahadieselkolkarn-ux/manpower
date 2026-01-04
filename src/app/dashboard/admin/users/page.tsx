
'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, updateDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { UserProfile, Role } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, Users, ShieldAlert, LinkIcon, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import FullPageLoader from '@/components/full-page-loader';
import { Employee } from '@/types/employee';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


function EditUserRolesModal({ user, roles, open, onOpenChange, onUpdate }: { user: UserProfile, roles: Role[], open: boolean, onOpenChange: (open: boolean) => void, onUpdate: () => void }) {
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roleIds || []);
  const [loading, setLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setIsAdmin(user.isAdmin);
      setSelectedRoles(user.roleIds || []);
    }
  }, [open, user]);

  const handleRoleToggle = (roleCode: string, checked: boolean) => {
    setSelectedRoles(prev => checked ? [...prev, roleCode] : prev.filter(code => code !== roleCode));
  };

  const handleSave = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isAdmin: isAdmin,
        roleIds: selectedRoles,
      });
      toast({ title: 'Success', description: 'User roles updated.' });
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user roles.' });
    } finally {
      setLoading(false);
    }
  };
  
  const roleIdToCodeMap = new Map(roles.map(r => [r.id, r.code]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Roles for {user.displayName}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Switch id="isAdmin" checked={isAdmin} onCheckedChange={setIsAdmin} />
            <Label htmlFor="isAdmin">Is Admin (Full System Access)</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {roles.filter(r => !r.isSystem).map(role => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={role.id}
                  checked={selectedRoles.includes(role.code)}
                  onCheckedChange={(checked) => handleRoleToggle(role.code, !!checked)}
                />
                <Label htmlFor={role.id}>{role.code.replace(/_/g, ' ')}</Label>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkEmployeeModal({ user, open, onOpenChange, onUpdate, allOfficeEmployees, allUsers }: { user: UserProfile, open: boolean, onOpenChange: (open: boolean) => void, onUpdate: () => void, allOfficeEmployees: Employee[], allUsers: UserProfile[] }) {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [loading, setLoading] = useState(false);
    const db = useFirestore();
    const { toast } = useToast();

    const availableEmployees = useMemo(() => {
        const linkedEmployeeIds = new Set(allUsers.map(u => u.employeeId).filter(Boolean));
        return allOfficeEmployees.filter(emp => !linkedEmployeeIds.has(emp.id));
    }, [allOfficeEmployees, allUsers]);

    const handleLink = async () => {
        if (!db || !selectedEmployeeId) return;
        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { employeeId: selectedEmployeeId });
            toast({ title: 'Success', description: 'User linked to employee.' });
            onUpdate();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to link user.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Link User to Employee</DialogTitle>
                    <DialogDescription>Link '{user.displayName}' to an office employee profile.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Select onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an unlinked office employee..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableEmployees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>
                                    {emp.personalInfo.firstName} {emp.personalInfo.lastName} ({emp.employeeCode})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleLink} disabled={loading || !selectedEmployeeId}>{loading ? 'Linking...' : 'Link Employee'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminUsersPage() {
  const db = useFirestore();
  const { userProfile: currentUserProfile, loading: authLoading } = useAuth();
  
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [userToLink, setUserToLink] = useState<UserProfile | null>(null);
  const [userToUnlink, setUserToUnlink] = useState<UserProfile | null>(null);

  const usersQuery = useMemoFirebase(() => (db ? collection(db, 'users') : null), [db]);
  const { data: users, isLoading: isLoadingUsers, refetch: refetchUsers } = useCollection<UserProfile>(usersQuery);

  const rolesQuery = useMemoFirebase(() => (db ? collection(db, 'roles') : null), [db]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  
  const officeEmployeesQuery = useMemoFirebase(() => (db ? query(collection(db, 'employees'), where('employeeType', '==', 'OFFICE')) : null), [db]);
  const { data: officeEmployees, isLoading: isLoadingEmployees } = useCollection<Employee>(officeEmployeesQuery);

  const employeeMap = useMemo(() => new Map(officeEmployees?.map(e => [e.id, `${e.personalInfo.firstName} ${e.personalInfo.lastName}`])), [officeEmployees]);

  const { toast } = useToast();

  const handleUnlink = async () => {
    if (!db || !userToUnlink) return;

    const userRef = doc(db, 'users', userToUnlink.uid);
    try {
        await updateDoc(userRef, { employeeId: null });
        toast({ title: 'Success', description: 'User has been unlinked from employee.' });
        refetchUsers();
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to unlink user.' });
    } finally {
        setUserToUnlink(null);
    }
  };
  
  const isLoading = authLoading || isLoadingUsers || isLoadingRoles || isLoadingEmployees;

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!currentUserProfile?.isAdmin) {
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
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Users />
            User Management
          </h1>
          <p className="text-muted-foreground">Assign roles, manage status, and link users to employee profiles.</p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Linked Employee</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users && users.length > 0 ? (
                users.map(user => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.displayName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {user.isAdmin && <span className="px-2 py-1 text-xs font-bold bg-destructive text-destructive-foreground rounded-full">ADMIN</span>}
                      {user.roleIds?.map(roleCode => (
                        <span key={roleCode} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">{roleCode?.replace(/_/g, ' ')}</span>
                      ))}
                    </TableCell>
                    <TableCell>
                      {user.employeeId ? (
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-4 w-4 text-green-600"/>
                          {employeeMap.get(user.employeeId) || 'Linked'}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm" onClick={() => setUserToEdit(user)}>
                        Edit Roles
                      </Button>
                       {user.employeeId ? (
                         <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setUserToUnlink(user)}>
                           Unlink
                         </Button>
                       ) : (
                         <Button variant="ghost" size="sm" onClick={() => setUserToLink(user)}>
                           Link
                         </Button>
                       )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {userToEdit && roles && (
        <EditUserRolesModal
          user={userToEdit}
          roles={roles}
          open={!!userToEdit}
          onOpenChange={() => setUserToEdit(null)}
          onUpdate={refetchUsers}
        />
      )}

      {userToLink && officeEmployees && users && (
        <LinkEmployeeModal
            user={userToLink}
            open={!!userToLink}
            onOpenChange={() => setUserToLink(null)}
            onUpdate={refetchUsers}
            allOfficeEmployees={officeEmployees}
            allUsers={users}
        />
      )}

      {userToUnlink && (
        <AlertDialog open={!!userToUnlink} onOpenChange={() => setUserToUnlink(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to unlink this user?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove the association between the user account '{userToUnlink.displayName}' and the employee profile '{employeeMap.get(userToUnlink.employeeId!)}'. It will NOT delete either record.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnlink}>Yes, Unlink</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}


