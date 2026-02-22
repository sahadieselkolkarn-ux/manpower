
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Users, Download, Award, Hammer } from 'lucide-react';
import { collection, query } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { type ManpowerPosition } from '@/types/position';
import PositionForm from '@/components/forms/position-form';
import { Badge } from '@/components/ui/badge';
import { useRouter, usePathname } from 'next/navigation';
import FullPageLoader from '@/components/full-page-loader';
import { canManageHrSettings } from '@/lib/authz';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function ManpowerPositionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<ManpowerPosition | null>(null);

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

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
  
  if (authLoading || isLoadingManpower) {
    return <FullPageLoader />;
  }

  if (!userProfile) {
    return <FullPageLoader />; // or access denied
  }


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2"><Users />Manpower Positions (Master)</h1>
          <p className="text-muted-foreground">Manage system-wide job positions for manpower.</p>
        </div>
        {canManage && <Button onClick={handleCreate}><PlusCircle className="mr-2 h-4 w-4" />Create Position</Button>}
      </div>

       <Alert>
        <AlertTitle className="font-bold">Important Note on Pricing</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Labor costs for payroll are defined per-contract in the <Button variant="link" asChild className="p-0 h-auto"><Link href="/dashboard/hr/manpower-costing">Manpower Costing</Link></Button> section.</li>
            <li>Sale prices for billing are defined in each <Button variant="link" asChild className="p-0 h-auto"><Link href="/dashboard/contracts">Contract's</Link></Button> Sale Rates section.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Requirements</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingManpower ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    {canManage && <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : manpowerPositions && manpowerPositions.length > 0 ? (
                manpowerPositions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell>{pos.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        {(pos.requiredCertificateIds?.length ?? 0) > 0 && 
                            <Badge variant="outline" className="flex items-center gap-1"><Award className="h-3 w-3" /> Certs: {pos.requiredCertificateIds?.length}</Badge>}
                        {(pos.requiredToolIds?.length ?? 0) > 0 && 
                            <Badge variant="outline" className="flex items-center gap-1"><Hammer className="h-3 w-3" /> Tools: {pos.requiredToolIds?.length}</Badge>}
                      </div>
                    </TableCell>
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
                <TableRow><TableCell colSpan={canManage ? 4 : 3} className="h-24 text-center">No manpower positions found.</TableCell></TableRow>
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
