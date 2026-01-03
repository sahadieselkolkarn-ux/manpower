
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { collection, collectionGroup, getDocs, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { type Assignment, EligibilityStatus } from '@/types/assignment';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { useEffectOnce } from 'react-use';
import { Wave } from '@/types/wave';
import { Project } from '@/types/project';

interface AssignmentWithDetails extends Assignment {
    waveCode?: string;
    projectName?: string;
    path?: string;
}

export default function AssignmentsPage() {
  const db = useFirestore();
  const { userProfile } = useAuth();
  
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffectOnce(() => {
    const fetchAssignments = async () => {
      if (!db) return;
      setIsLoading(true);

      try {
        const assignmentsSnap = await getDocs(query(collectionGroup(db, 'assignments'), orderBy('assignedAt', 'desc')));
        
        const wavePromises = new Map<string, Promise<any>>();
        const projectPromises = new Map<string, Promise<any>>();

        const getDocAndCache = (ref: any, cache: Map<string, Promise<any>>) => {
            if (!cache.has(ref.path)) {
                cache.set(ref.path, getDoc(ref));
            }
            return cache.get(ref.path);
        };
        
        const detailedAssignments = await Promise.all(assignmentsSnap.docs.map(async (doc) => {
            const assignment = { id: doc.id, ...doc.data() } as AssignmentWithDetails;
            assignment.path = doc.ref.path;
            
            const waveRef = doc.ref.parent.parent; // This is the wave document
            if (!waveRef) return assignment;

            const waveSnap = await getDocAndCache(waveRef, wavePromises);
            if (waveSnap && waveSnap.exists()) {
                const waveData = waveSnap.data() as Wave;
                assignment.waveCode = waveData.waveCode;

                const projectRef = waveRef.parent.parent; // This is the project document
                 if (!projectRef) return assignment;

                 const projectSnap = await getDocAndCache(projectRef, projectPromises);
                 if (projectSnap && projectSnap.exists()) {
                     const projectData = projectSnap.data() as Project;
                     assignment.projectName = projectData.name;
                 }
            }
            return assignment;
        }));

        setAssignments(detailedAssignments);
      } catch (error) {
          console.error("Error fetching assignments:", error);
      } finally {
          setIsLoading(false);
      }
    };

    fetchAssignments();
  });


  const canManage = userProfile?.isAdmin || userProfile?.roleIds.includes('HR_MANAGER') || userProfile?.roleIds.includes('OPERATION_MANAGER');

  const getWavePath = (assignment: AssignmentWithDetails) => {
    if (!assignment.path) return '#';
    const segments = assignment.path.split('/');
    if (segments.length >= 8) {
      // Return up to the wave ID
      return `/dashboard/clients/${segments[1]}/contracts/${segments[3]}/projects/${segments[5]}/waves/${segments[7]}`;
    }
    return '#';
  };

  const EligibilityBadge = ({ status }: { status: EligibilityStatus }) => {
    switch (status) {
      case 'PASS':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><ShieldCheck className="mr-1 h-3 w-3" />PASS</Badge>;
      case 'ALERT':
        return <Badge variant="secondary" className="bg-amber-500 text-white"><ShieldAlert className="mr-1 h-3 w-3" />ALERT</Badge>;
      case 'FAIL':
        return <Badge variant="destructive"><ShieldAlert className="mr-1 h-3 w-3" />FAIL</Badge>;
      default:
        return <Badge variant="outline"><Shield className="mr-1 h-3 w-3" />N/A</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          All Assignments
        </h1>
      </div>
      <p className="text-muted-foreground">
        A master list of all employee assignments across all waves and projects.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Master Assignment List</CardTitle>
          <CardDescription>
            This view provides a comprehensive overview of manpower allocation and compliance status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Wave</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Eligibility</TableHead>
                <TableHead>Assigned At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : assignments && assignments.length > 0 ? (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.employeeName}</TableCell>
                    <TableCell>{assignment.positionName}</TableCell>
                    <TableCell>
                      <Link href={getWavePath(assignment)} className="hover:underline text-primary">
                        {assignment.waveCode || 'N/A'}
                      </Link>
                      <p className="text-xs text-muted-foreground">{assignment.projectName}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{assignment.status}</Badge>
                    </TableCell>
                    <TableCell>
                       <EligibilityBadge status={(assignment.eligibility && assignment.eligibility.overall) || 'PASS'} />
                    </TableCell>
                    <TableCell>
                      {assignment.assignedAt?.toDate().toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No assignments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
