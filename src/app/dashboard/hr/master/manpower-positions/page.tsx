
'use client';

import React, { useState } from 'react';
import { collection, query } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, ShieldAlert, Users } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import FullPageLoader from '@/components/full-page-loader';
import { type ManpowerPosition } from '@/types/position';
import PositionForm from '@/components/forms/position-form';
import { canManageHrSettings } from '@/lib/authz';

export default function ManpowerPositionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<ManpowerPosition | null>(null);

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();

  const manpowerPositionsQuery = useMemoFirebase(() => (db ? query(collection(db, 'manpowerPositions')) : null), [db]);
  const { data: manpowerPositions, isLoading: isLoadingManpower, refetch: refetchManpower } = useCollection<ManpowerPosition>(manpowerPositionsQuery);

  const canManage = canManageHrSettings(userProfile);

  const handleCreate = () => {
    setSelectedPosition(null);
    setIsFormOpen(true);
  };

  const handleEdit = (pos: ManpowerPosition) => {
    setSelectedPosition(pos);
    setIsFormOpen(true);
  };
  
  if (authLoading) {
    return <FullPageLoader />;
  }

  if (!userProfile) {
    return <FullPageLoader />; // or access denied
  }


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2"><Users />Manpower Positions</h1>
          <p className="text-muted-foreground">Manage system-wide job positions for manpower.</p>
        </div>
        {canManage && <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Create Position</Button>}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Onshore Cost/Day</TableHead>
                <TableHead>Offshore Cost/Day</TableHead>
                <TableHead>Description</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingManpower ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                    {canManage && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : manpowerPositions && manpowerPositions.length > 0 ? (
                manpowerPositions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell className="font-mono">{pos.costRateOnshore?.toLocaleString() || '-'}</TableCell>
                    <TableCell className="font-mono">{pos.costRateOffshore?.toLocaleString() || '-'}</TableCell>
                    <TableCell>{pos.description}</TableCell>
                    {canManage && <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(pos)}>Edit</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>}
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">No manpower positions found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {canManage && isFormOpen && (
        <PositionForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          position={selectedPosition}
          positionType={'MANPOWER'}
          onSuccess={refetchManpower}
        />
      )}
    </div>
  );
}
