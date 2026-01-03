'use client';

import React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/types/user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import FullPageLoader from '@/components/full-page-loader';
import { ShieldAlert } from 'lucide-react';

export default function AdminRolesPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  
  const rolesQuery = useMemoFirebase(() => (db ? query(collection(db, 'roles'), orderBy('department'), orderBy('level')) : null), [db]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);

  const isAdmin = userProfile?.isAdmin;

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
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRoles ? (
                Array.from({ length: 9 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                  </TableRow>
                ))
              ) : roles && roles.length > 0 ? (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-mono">{role.code}</TableCell>
                    <TableCell><Badge variant="outline">{role.department}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{role.level}</Badge></TableCell>
                    <TableCell>{role.description}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">No roles found. Seed data might be missing.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
