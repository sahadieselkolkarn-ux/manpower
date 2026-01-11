
'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { UserProfile, Role, RoleCode } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShieldAlert, Link as LinkIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import FullPageLoader from '@/components/full-page-loader';
import { Employee } from '@/types/employee';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

function EditUserRolesModal({ user, roles, open, onOpenChange, onUpdate }: { user: UserProfile, roles: Role[], open: boolean, onOpenChange: (open: boolean) => void, onUpdate: () => void }) {
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(user.roleIds || []);
  const [loading, setLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setIsAdmin(user.isAdmin);
      setSelectedRoleIds(user.roleIds || []);
    }
  }, [open, user]);

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    setSelectedRoleIds(prev => checked ? [...prev, roleId] : prev.filter(id => id !== roleId));
  };

  const handleSave = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      const selectedRoles = roles.filter(r => selectedRoleIds.includes(r.id));
      const selectedRoleCodes = selectedRoles.map(r => r.code);

      if (isAdmin && !selectedRoleCodes.includes('ADMIN')) {
          selectedRoleCodes.push('ADMIN');
      }

      await updateDoc(userRef, {
        isAdmin: isAdmin,
        roleIds: selectedRoleIds,
        roleCodes: selectedRoleCodes,
        updatedAt: serverTimestamp()
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
                  checked={selectedRoleIds.includes(role.id)}
                  onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                />
                <Label htmlFor={role.id}>{role.name ?? role.code}</Label>
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
        const batch = writeBatch(db);
        try {
            const userRef = doc(db, 'users', user.uid);
            batch.update(userRef, { employeeId: selectedEmployeeId, updatedAt: serverTimestamp() });

            const employeeRef = doc(db, 'employees', selectedEmployeeId);
            batch.update(employeeRef, { userUid: user.uid, updatedAt: serverTimestamp() });

            await batch.commit();

            toast({ title: 'Success', description: 'User linked to employee profile.' });
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

  const usersQuery = useMemoFirebase(() => (db ? collection(db, 'users') : null), [db]);
  const { data: users, isLoading: isLoadingUsers, refetch: refetchUsers } = useCollection<UserProfile>(usersQuery);

  const rolesQuery = useMemoFirebase(() => (db ? collection(db, 'roles') : null), [db]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  const roleMap = useMemo(() => new Map(roles?.map(r => [r.id, r.name ?? r.code])), [roles]);
  const rolesByCode = useMemo(() => new Map(roles?.map(r => [r.code, r])), [roles]);
  
  const officeEmployeesQuery = useMemoFirebase(() => (db ? collection(db, 'employees') : null), [db]);
  const { data: officeEmployees, isLoading: isLoadingEmployees } = useCollection<Employee>(officeEmployeesQuery);

  const employeeMap = useMemo(() => new Map(officeEmployees?.map(e => [e.id, `${e.personalInfo.firstName} ${e.personalInfo.lastName}`])), [officeEmployees]);

  const { toast } = useToast();

  const handleApprove = async (userToApprove: UserProfile) => {
    if (!db || !currentUserProfile) return;
    try {
        const userRef = doc(db, 'users', userToApprove.uid);
        const requestedRoleCode = userToApprove.requestedRoleCode || 'MANAGEMENT_MANAGER';
        const targetRole = rolesByCode.get(requestedRoleCode as RoleCode);

        await updateDoc(userRef, {
            status: 'ACTIVE',
            roleIds: targetRole ? [targetRole.id] : [],
            roleCodes: targetRole ? [targetRole.code] : [],
            approvedAt: serverTimestamp(),
            approvedByUid: currentUserProfile.uid,
            approvedByName: currentUserProfile.displayName,
            updatedAt: serverTimestamp(),
        });

        toast({ title: 'Success', description: 'User has been approved.' });
        refetchUsers();
    } catch(error) {
        console.error("Error approving user:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to approve user.' });
    }
  }

  const handleDisable = async (userToDisable: UserProfile) => {
      if (!db || !currentUserProfile) return;
      try {
          await updateDoc(doc(db, 'users', userToDisable.uid), {
              status: 'DISABLED',
              updatedAt: serverTimestamp(),
          });
          toast({ title: 'Success', description: 'User has been disabled.' });
          refetchUsers();
      } catch(error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to disable user.' });
      }
  };

  const handleUnlink = async (userToUnlink: UserProfile) => {
    if (!db || !userToUnlink || !userToUnlink.employeeId) return;
    
    const batch = writeBatch(db);
    try {
        const userRef = doc(db, 'users', userToUnlink.uid);
        batch.update(userRef, { employeeId: null, updatedAt: serverTimestamp() });

        const employeeRef = doc(db, 'employees', userToUnlink.employeeId);
        batch.update(employeeRef, { userUid: null, updatedAt: serverTimestamp() });

        await batch.commit();

        toast({ title: 'Success', description: 'User has been unlinked from employee.' });
        refetchUsers();
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to unlink user.' });
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
                <TableHead>Status</TableHead>
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
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
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
                    <TableCell>
                        <Badge variant={user.status === 'ACTIVE' ? 'default' : user.status === 'PENDING' ? 'secondary' : 'destructive'}>
                            {user.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {user.isAdmin && <span className="px-2 py-1 text-xs font-bold bg-destructive text-destructive-foreground rounded-full">ADMIN</span>}
                      {user.roleIds?.map(roleId => (
                        <span key={roleId} className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">{roleMap.get(roleId) || roleId}</span>
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
                       {user.status === 'PENDING' && (
                           <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleApprove(user)}>
                               <CheckCircle className="mr-2 h-4 w-4" /> Approve
                           </Button>
                       )}
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setUserToEdit(user)}>Edit Roles</DropdownMenuItem>
                                {user.employeeId ? (
                                    <DropdownMenuItem onClick={() => handleUnlink(user)}>Unlink Employee</DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => setUserToLink(user)}>Link Employee</DropdownMenuItem>
                                )}
                                {user.status === 'ACTIVE' && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDisable(user)}>Disable User</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No users found.</TableCell>
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

    </div>
  );
}
