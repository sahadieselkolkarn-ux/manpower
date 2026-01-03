'use client';

import React, { useState } from 'react';
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
import { Position, PositionType } from '@/types/position';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PositionForm from '@/components/forms/position-form';

function PositionsTable({ positions, onEdit, type }: { positions: Position[] | null; onEdit: (pos: Position) => void; type: PositionType }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          {type === 'FIELD' && <TableHead>Onshore Cost/Day</TableHead>}
          {type === 'FIELD' && <TableHead>Offshore Cost/Day</TableHead>}
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!positions ? (
          Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              {type === 'FIELD' && <TableCell><Skeleton className="h-5 w-24" /></TableCell>}
              {type === 'FIELD' && <TableCell><Skeleton className="h-5 w-24" /></TableCell>}
              <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : positions.length > 0 ? (
          positions.map((pos) => (
            <TableRow key={pos.id}>
              <TableCell className="font-medium">{pos.name}</TableCell>
              <TableCell><Badge variant="outline">{pos.type}</Badge></TableCell>
              {type === 'FIELD' && <TableCell className="font-mono">{pos.costRateOnshore?.toLocaleString() || '-'}</TableCell>}
              {type === 'FIELD' && <TableCell className="font-mono">{pos.costRateOffshore?.toLocaleString() || '-'}</TableCell>}
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
          <TableRow><TableCell colSpan={type === 'FIELD' ? 5 : 3} className="h-24 text-center">No positions found.</TableCell></TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export default function PositionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [activeTab, setActiveTab] = useState<PositionType>('FIELD');

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();

  const positionsQuery = useMemoFirebase(() => (db ? query(collection(db, 'positions')) : null), [db]);
  const { data: positions, isLoading, refetch } = useCollection<Position>(positionsQuery);

  const canManage = userProfile?.isAdmin || userProfile?.roleIds.includes('HR_MANAGER');

  const handleCreate = () => {
    setSelectedPosition(null);
    setIsFormOpen(true);
  };

  const handleEdit = (pos: Position) => {
    setSelectedPosition(pos);
    setIsFormOpen(true);
  };
  
  if (authLoading || isLoading) {
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

  const fieldPositions = positions?.filter(p => p.type === 'FIELD') || null;
  const officePositions = positions?.filter(p => p.type === 'OFFICE') || null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Positions</h1>
          <p className="text-muted-foreground">Manage system-wide job positions and their base labor costs.</p>
        </div>
        <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Create Position</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as PositionType)}>
            <TabsList>
              <TabsTrigger value="FIELD">Field Positions</TabsTrigger>
              <TabsTrigger value="OFFICE">Office Positions</TabsTrigger>
            </TabsList>
            <TabsContent value="FIELD" className="mt-4">
              <PositionsTable positions={fieldPositions} onEdit={handleEdit} type="FIELD" />
            </TabsContent>
            <TabsContent value="OFFICE" className="mt-4">
              <PositionsTable positions={officePositions} onEdit={handleEdit} type="OFFICE" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {isFormOpen && (
        <PositionForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          position={selectedPosition}
          positionType={selectedPosition?.type || activeTab}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
