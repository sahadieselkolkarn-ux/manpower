
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, updateDoc, serverTimestamp, where, collectionGroup } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, UserCheck } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import FullPageLoader from '@/components/full-page-loader';
import { Assignment } from '@/types/assignment';
import { WaveWithProject } from '@/types/wave';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { useEffectOnce } from 'react-use';


export default function AssignmentsMasterListPage() {
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: assignments, isLoading: isLoadingAssignments, refetch: refetchAssignments } = useCollection<Assignment>(
    useMemoFirebase(() => db ? query(collection(db, 'assignments'), orderBy('createdAt', 'desc')) : null, [db])
  );
  
  // Fetch all waves for the filter dropdown.
  const { data: waves, isLoading: isLoadingWaves } = useCollection<WaveWithProject>(
    useMemoFirebase(() => db ? query(collectionGroup(db, 'waves')) : null, [db])
  );

  const [filterWave, setFilterWave] = useState(searchParams.get('waveId') || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentToEnd, setAssignmentToEnd] = useState<Assignment | null>(null);

  const waveMap = useMemo(() => new Map(waves?.map(w => [w.id, w])), [waves]);

  const filteredAssignments = useMemo(() => {
    if (!assignments) return [];
    return assignments.filter(a => {
      const waveMatch = filterWave === 'all' || a.waveId === filterWave;
      const statusMatch = filterStatus === 'all' || a.status === filterStatus;
      const searchMatch = searchTerm === '' || 
        a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
      return waveMatch && statusMatch && searchMatch;
    });
  }, [assignments, filterWave, filterStatus, searchTerm]);

  const handleEndAssignment = async () => {
    if (!db || !assignmentToEnd || !userProfile) return;

    const assignmentRef = doc(db, 'assignments', assignmentToEnd.id);
    try {
      await updateDoc(assignmentRef, {
        status: 'ENDED',
        endedAt: serverTimestamp(),
        endedBy: userProfile.uid,
      });
      toast({ title: "Success", description: "Assignment has been ended." });
      refetchAssignments();
    } catch (error) {
      console.error("Error ending assignment:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not end assignment." });
    } finally {
      setAssignmentToEnd(null);
    }
  };

  const isLoading = isLoadingAssignments || isLoadingWaves || authLoading;

  if (isLoading) return <FullPageLoader />;
  
  const canManage = userProfile?.isAdmin || userProfile?.roleIds?.includes('HR_MANAGER');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2"><UserCheck /> Assignments</h1>
          <p className="text-muted-foreground">Manage all employee assignments to work waves.</p>
        </div>
        {canManage && (
          <Button onClick={() => router.push('/dashboard/hr/assignments/new')}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Assignment
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Master Assignment List</CardTitle>
          <CardDescription>A complete log of all manpower assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Input 
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterWave} onValueChange={setFilterWave}>
              <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Waves</SelectItem>
                {waves?.map(w => <SelectItem key={w.id} value={w.id}>{w.waveCode}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ENDED">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Wave</TableHead>
                <TableHead>Dates (Start - End)</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAssignments ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={canManage ? 5 : 4}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                ))
              ) : filteredAssignments.length > 0 ? (
                filteredAssignments.map(a => {
                  const wave = waveMap.get(a.waveId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.employeeName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{a.employeeCode}</div>
                      </TableCell>
                      <TableCell>
                        {wave ? (
                          <Link className="hover:underline text-primary" href={`/dashboard/clients/${wave.clientId}/contracts/${wave.contractId}/projects/${wave.projectId}/waves/${wave.id}`}>
                            {wave.waveCode}
                          </Link>
                        ) : a.waveId}
                      </TableCell>
                      <TableCell>{formatDate(a.startDate)} - {formatDate(a.endDate)}</TableCell>
                      <TableCell><Badge variant={a.status === 'ACTIVE' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem disabled={a.status === 'ENDED'} onClick={() => setAssignmentToEnd(a)}>End Assignment</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow><TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">No assignments found for the current filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {assignmentToEnd && (
        <AlertDialog open={!!assignmentToEnd} onOpenChange={() => setAssignmentToEnd(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End Assignment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will change the status for {assignmentToEnd.employeeName} to 'ENDED'. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleEndAssignment}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
