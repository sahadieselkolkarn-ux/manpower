// This is a new file: src/app/dashboard/hr/manpower-costing/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  collection,
  doc,
  query,
  collectionGroup,
  where,
} from 'firebase/firestore';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { canManageHR } from '@/lib/authz';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import FullPageLoader from '@/components/full-page-loader';
import { DollarSign, ShieldAlert } from 'lucide-react';
import { Client } from '@/types/client';
import { Contract } from '@/types/contract';
import { ManpowerPosition } from '@/types/position';
import { ManpowerCosting } from '@/types/manpower-costing';
import ManpowerCostingForm from '@/components/forms/manpower-costing-form';

interface CostingRowData {
  positionId: string;
  positionName: string;
  onshoreSell: number;
  offshoreSell: number;
  onshoreCost?: number;
  offshoreCost?: number;
  effectiveFrom?: string;
  note?: string;
}

export default function ManpowerCostingPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const canManage = canManageHR(userProfile);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<CostingRowData | null>(
    null
  );

  // --- Data Fetching ---
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(
    useMemoFirebase(() => (db ? collection(db, 'clients') : null), [db])
  );
  const { data: contracts, isLoading: isLoadingContracts } = useCollection<
    Contract
  >(
    useMemoFirebase(
      () =>
        db && selectedClientId
          ? query(
              collection(db, 'clients', selectedClientId, 'contracts'),
              where('isDeleted', '!=', true)
            )
          : null,
      [db, selectedClientId]
    )
  );

  const contractRef = useMemoFirebase(
    () =>
      db && selectedClientId && selectedContractId
        ? doc(db, 'clients', selectedClientId, 'contracts', selectedContractId)
        : null,
    [db, selectedClientId, selectedContractId]
  );
  const { data: contract, isLoading: isLoadingContract } = useDoc<Contract>(
    contractRef
  );
  
  const { data: positions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(
      useMemoFirebase(() => db ? collection(db, 'manpowerPositions') : null, [db])
  );
  const positionMap = useMemo(() => new Map(positions?.map(p => [p.id, p.name])), [positions]);
  
  const { data: costings, isLoading: isLoadingCostings, refetch: refetchCostings } = useCollection<ManpowerCosting>(
      useMemoFirebase(() => contractRef ? collection(contractRef, 'manpowerCosting') : null, [contractRef])
  );

  // --- Memos & Derived State ---
  const tableData = useMemo((): CostingRowData[] => {
    if (!contract || !contract.saleRates || !positionMap) return [];
    
    const costingMap = new Map(costings?.map(c => [c.positionId, c]));

    return contract.saleRates.map(rate => {
      const costing = costingMap.get(rate.positionId);
      return {
        positionId: rate.positionId,
        positionName: positionMap.get(rate.positionId) || 'Unknown Position',
        onshoreSell: rate.onshoreSellDailyRateExVat ?? rate.dailyRateExVat ?? 0,
        offshoreSell: rate.offshoreSellDailyRateExVat ?? rate.dailyRateExVat ?? 0,
        onshoreCost: costing?.onshoreLaborCostDaily,
        offshoreCost: costing?.offshoreLaborCostDaily,
        effectiveFrom: costing?.effectiveFrom?.toDate().toLocaleDateString(),
        note: costing?.note,
      };
    });
  }, [contract, positionMap, costings]);

  const handleEdit = (positionData: CostingRowData) => {
    setSelectedPosition(positionData);
    setIsFormOpen(true);
  };
  
  const isLoading = authLoading || isLoadingClients || isLoadingContracts || isLoadingPositions;

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!canManage) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="m-4 text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <ShieldAlert className="text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <DollarSign />
            ต้นทุน Manpower ในสัญญา
          </h1>
          <p className="text-muted-foreground">
            จัดการต้นทุนค่าแรงของลูกจ้างสำหรับแต่ละสัญญา
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scope Selection</CardTitle>
          <CardDescription>
            Please select a customer and contract to view or edit manpower
            costs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              value={selectedClientId}
              onValueChange={(value) => {
                setSelectedClientId(value);
                setSelectedContractId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a Customer..." />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedContractId}
              onValueChange={setSelectedContractId}
              disabled={!selectedClientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a Contract..." />
              </SelectTrigger>
              <SelectContent>
                {contracts?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedContractId && (
        <Card>
          <CardHeader>
            <CardTitle>Costing Table for: {contract?.name}</CardTitle>
            <CardDescription>
              Costs are daily labor rates. Sell rates are read-only from the contract.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Onshore Sell</TableHead>
                  <TableHead>Offshore Sell</TableHead>
                  <TableHead className="bg-muted">Onshore Cost</TableHead>
                  <TableHead className="bg-muted">Offshore Cost</TableHead>
                  <TableHead className="bg-muted">Effective From</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingContract || isLoadingCostings ? (
                    Array.from({length: 3}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : tableData.length > 0 ? (
                  tableData.map((row) => (
                    <TableRow key={row.positionId}>
                      <TableCell className="font-medium">
                        {row.positionName}
                      </TableCell>
                      <TableCell className="font-mono">{row.onshoreSell.toLocaleString()}</TableCell>
                      <TableCell className="font-mono">{row.offshoreSell.toLocaleString()}</TableCell>
                      <TableCell className="font-mono bg-muted">{row.onshoreCost?.toLocaleString() ?? '-'}</TableCell>
                      <TableCell className="font-mono bg-muted">{row.offshoreCost?.toLocaleString() ?? '-'}</TableCell>
                      <TableCell className="bg-muted">{row.effectiveFrom ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(row)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No billable positions (sale rates) found in this
                      contract.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {isFormOpen && selectedPosition && contractRef && (
        <ManpowerCostingForm
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            contractRef={contractRef}
            positionData={selectedPosition}
            onSuccess={refetchCostings}
        />
      )}
    </div>
  );
}
