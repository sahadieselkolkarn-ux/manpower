
'use client';

import React, { useState } from 'react';
import { collection, query } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, ShieldAlert, BookUser } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import FullPageLoader from '@/components/full-page-loader';
import { type OfficePosition } from '@/types/position';
import PositionForm from '@/components/forms/position-form';
import { canManageHrSettings } from '@/lib/authz';

export default function OfficePositionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<OfficePosition | null>(null);

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();

  const officePositionsQuery = useMemoFirebase(() => (db ? query(collection(db, 'officePositions')) : null), [db]);
  const { data: officePositions, isLoading: isLoadingOffice, refetch: refetchOffice } = useCollection<OfficePosition>(officePositionsQuery);

  const canManage = canManageHrSettings(userProfile);

  const handleCreate = () => {
    setSelectedPosition(null);
    setIsFormOpen(true);
  };

  const handleEdit = (pos: OfficePosition) => {
    setSelectedPosition(pos);
    setIsFormOpen(true);
  };
  
  if (authLoading) {
    return <FullPageLoader />;
  }

  if (!userProfile) { // A basic check if authz hasn't redirected yet
    return <FullPageLoader />;
  }


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2"><BookUser />Office Positions</h1>
          <p className="text-muted-foreground">Manage system-wide job positions for office staff.</p>
        </div>
        {canManage && <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Create Position</Button>}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingOffice ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                    {canManage && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : officePositions && officePositions.length > 0 ? (
                officePositions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
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
                <TableRow><TableCell colSpan={canManage ? 3 : 2} className="h-24 text-center">No office positions found.</TableCell></TableRow>
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
          positionType={'OFFICE'}
          onSuccess={refetchOffice}
        />
      )}
    </div>
  );
}
