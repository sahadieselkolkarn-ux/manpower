
'use client';

import React, { useState, useMemo } from 'react';
import {
  collection,
  doc,
  query,
  collectionGroup,
  where,
  updateDoc,
  serverTimestamp,
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
import { DollarSign, ShieldAlert, Edit } from 'lucide-react';
import { Client } from '@/types/client';
import { Contract, ContractOtRules } from '@/types/contract';
import { ManpowerPosition } from '@/types/position';
import { ManpowerCosting } from '@/types/manpower-costing';
import ManpowerCostingForm from '@/components/forms/manpower-costing-form';
import PayrollOtRulesForm from '@/components/forms/payroll-ot-rules-form';

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
  const [isCostingFormOpen, setIsCostingFormOpen] = useState(false);
  const [isOtFormOpen, setIsOtFormOpen] = useState(false);
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
  const { data: contract, isLoading: isLoadingContract, refetch: refetchContract } = useDoc<Contract>(
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
  
  const payrollOtRules = contract?.payrollOtRules ?? {
      workdayMultiplier: 1.5,
      weeklyHolidayMultiplier: 2,
      contractHolidayMultiplier: 3,
  };

  const handleEditCosting = (positionData: CostingRowData) => {
    setSelectedPosition(positionData);
    setIsCostingFormOpen(true);
  };
  
  const handleEditOtRules = () => {
    setIsOtFormOpen(true);
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
            จัดการต้นทุนค่าแรงและเงื่อนไข OT สำหรับจ่ายลูกจ้างของแต่ละสัญญา
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Costing Table for: {contract?.name}</CardTitle>
              <CardDescription>
                Sell rates are read-only. Cost rates are editable per position for payroll calculation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Onshore Sell</TableHead>
                    <TableHead>Onshore Cost</TableHead>
                    <TableHead>Offshore Sell</TableHead>
                    <TableHead>Offshore Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingContract || isLoadingCostings ? (
                      Array.from({length: 3}).map((_, i) => (
                          <TableRow key={i}>
                              <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                          </TableRow>
                      ))
                  ) : tableData.length > 0 ? (
                    tableData.map((row) => (
                          <TableRow key={row.positionId}>
                          <TableCell className="font-medium">
                              {row.positionName}
                          </TableCell>
                          <TableCell className="font-mono">{row.onshoreSell.toLocaleString()}</TableCell>
                          <TableCell className="font-mono bg-muted">{row.onshoreCost?.toLocaleString() ?? '-'}</TableCell>
                           <TableCell className="font-mono">{row.offshoreSell.toLocaleString()}</TableCell>
                          <TableCell className="font-mono bg-muted">{row.offshoreCost?.toLocaleString() ?? '-'}</TableCell>
                          <TableCell className="text-right">
                              <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCosting(row)}
                              >
                              Edit Cost
                              </Button>
                          </TableCell>
                          </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No billable positions (sale rates) found in this
                        contract.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Payroll OT Rules</CardTitle>
                        <Button variant="outline" size="sm" onClick={handleEditOtRules}><Edit className="mr-2 h-4 w-4"/>Edit</Button>
                    </div>
                    <CardDescription>OT multipliers for paying employees under this contract.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-sm text-muted-foreground">Workday</p><p className="text-2xl font-bold">{payrollOtRules.workdayMultiplier}x</p></div>
                    <div><p className="text-sm text-muted-foreground">Weekly Hol.</p><p className="text-2xl font-bold">{payrollOtRules.weeklyHolidayMultiplier}x</p></div>
                    <div><p className="text-sm text-muted-foreground">Contract Hol.</p><p className="text-2xl font-bold">{payrollOtRules.contractHolidayMultiplier}x</p></div>
                </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {isCostingFormOpen && selectedPosition && contractRef && (
        <ManpowerCostingForm
            open={isCostingFormOpen}
            onOpenChange={setIsCostingFormOpen}
            contractRef={contractRef}
            positionData={selectedPosition}
            onSuccess={refetchCostings}
        />
      )}
      {isOtFormOpen && contractRef && contract && (
        <PayrollOtRulesForm
            open={isOtFormOpen}
            onOpenChange={setIsOtFormOpen}
            contractRef={contractRef}
            currentRules={contract.payrollOtRules}
            onSuccess={refetchContract}
        />
      )}
    </div>
  );
}
