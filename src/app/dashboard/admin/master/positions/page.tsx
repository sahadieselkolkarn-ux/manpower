'use client';

import React, { useState, useMemo } from 'react';
import { collection, query } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, ShieldAlert } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import FullPageLoader from '@/components/full-page-loader';
import { type ManpowerPosition, type OfficePosition } from '@/types/position';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PositionForm from '@/components/forms/position-form';

type PositionVariant = ManpowerPosition | OfficePosition;

function PositionsTable({ positions, onEdit, type, isLoading }: { positions: PositionVariant[] | null; onEdit: (pos: PositionVariant) => void; type: 'MANPOWER' | 'OFFICE', isLoading: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          {type === 'MANPOWER' && <TableHead>Onshore Cost/Day</TableHead>}
          {type === 'MANPOWER' && <TableHead>Offshore Cost/Day</TableHead>}
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              {type === 'MANPOWER' && <TableCell><Skeleton className="h-5 w-24" /></TableCell>}
              {type === 'MANPOWER' && <TableCell><Skeleton className="h-5 w-24" /></TableCell>}
              <TableCell><Skeleton className="h-5 w-64" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : positions && positions.length > 0 ? (
          positions.map((pos) => (
            <TableRow key={pos.id}>
              <TableCell className="font-medium">{pos.name}</TableCell>
              {type === 'MANPOWER' && <TableCell className="font-mono">{(pos as ManpowerPosition).costRateOnshore?.toLocaleString() || '-'}</TableCell>}
              {type === 'MANPOWER' && <TableCell className="font-mono">{(pos as ManpowerPosition).costRateOffshore?.toLocaleString() || '-'}</TableCell>}
              <TableCell>{pos.description}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(pos)}>Edit</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow><TableCell colSpan={type === 'MANPOWER' ? 4 : 2} className="h-24 text-center">No positions found.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export default function PositionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionVariant | null>(null);
  const [activeTab, setActiveTab] = useState<'MANPOWER' | 'OFFICE'>('MANPOWER');

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();

  const officePositionsQuery = useMemoFirebase(() => (db ? query(collection(db, 'officePositions')) : null), [db]);
  const { data: officePositions, isLoading: isLoadingOffice, refetch: refetchOffice } = useCollection<OfficePosition>(officePositionsQuery);
  
  const manpowerPositionsQuery = useMemoFirebase(() => (db ? query(collection(db, 'manpowerPositions')) : null), [db]);
  const { data: manpowerPositions, isLoading: isLoadingManpower, refetch: refetchManpower } = useCollection<ManpowerPosition>(manpowerPositionsQuery);

  const canManage = userProfile?.isAdmin || userProfile?.roleIds.includes('HR_MANAGER');

  const handleCreate = () => {
    setSelectedPosition(null);
    setIsFormOpen(true);
  };

  const handleEdit = (pos: PositionVariant) => {
    setSelectedPosition(pos);
    setIsFormOpen(true);
  };
  
  if (authLoading) {
    return <FullPageLoader />;
  }

  if (!canManage) {
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
          <h1 className="text-3xl font-bold tracking-tight font-headline">Positions</h1>
          <p className="text-muted-foreground">Manage system-wide job positions for office staff and manpower.</p>
        </div>
        <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Create Position</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as 'MANPOWER' | 'OFFICE')}>
            <TabsList>
              <TabsTrigger value="MANPOWER">ตำแหน่ง (ลูกจ้างแมนพาวเวอร์)</TabsTrigger>
              <TabsTrigger value="OFFICE">ตำแหน่ง (พนักงานออฟฟิศ)</TabsTrigger>
            </TabsList>
            <TabsContent value="MANPOWER" className="mt-4">
              <PositionsTable positions={manpowerPositions} onEdit={handleEdit} type="MANPOWER" isLoading={isLoadingManpower} />
            </TabsContent>
            <TabsContent value="OFFICE" className="mt-4">
              <PositionsTable positions={officePositions} onEdit={handleEdit} type="OFFICE" isLoading={isLoadingOffice} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {isFormOpen && (
        <PositionForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          position={selectedPosition}
          positionType={activeTab}
          onSuccess={() => {
            if (activeTab === 'MANPOWER') refetchManpower();
            else refetchOffice();
          }}
        />
      )}
    </div>
  );
}
