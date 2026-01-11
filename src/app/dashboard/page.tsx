'use client';

import React, { useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  collectionGroup,
} from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  FolderKanban,
  Ship,
  Users,
  Receipt,
  FileText,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { type Contract } from '@/types/contract';
import { type Project } from '@/types/project';
import { type Wave } from '@/types/wave';
import { type Employee } from '@/types/employee';
import { type Invoice } from '@/types/invoice';
import { formatDate, getInvoiceStatusVariant } from '@/lib/utils';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  isLoading: boolean;
}

function StatCard({ title, value, icon, description, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const db = useFirestore();

  // Data Fetching
  const { data: contracts, isLoading: isLoadingContracts } = useCollection<Contract>(
    useMemoFirebase(() => db ? query(collectionGroup(db, 'contracts'), where('status', '==', 'active')) : null, [db])
  );
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(
     useMemoFirebase(() => db ? query(collectionGroup(db, 'projects')) : null, [db])
  );
  const { data: waves, isLoading: isLoadingWaves } = useCollection<Wave>(
     useMemoFirebase(() => db ? query(collectionGroup(db, 'waves'), where('status', '==', 'active')) : null, [db])
  );
  const { data: manpower, isLoading: isLoadingManpower } = useCollection<Employee>(
    useMemoFirebase(() => db ? query(collection(db, 'employees'), where('employeeType', '==', 'FIELD')) : null, [db])
  );
  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(
     useMemoFirebase(() => db ? query(collection(db, 'invoices'), orderBy('issueDate', 'desc'), limit(5)) : null, [db])
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">
        Dashboard Overview
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Contracts"
          value={contracts?.length ?? 0}
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoadingContracts}
        />
        <StatCard
          title="Total Projects"
          value={projects?.length ?? 0}
          icon={<FolderKanban className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoadingProjects}
        />
        <StatCard
          title="Ongoing Waves"
          value={waves?.length ?? 0}
          icon={<Ship className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoadingWaves}
        />
        <StatCard
          title="Total Manpower"
          value={manpower?.length ?? 0}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoadingManpower}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship />
              Ongoing Waves
            </CardTitle>
            <CardDescription>
              A list of currently active work waves.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wave Code</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Manpower</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingWaves || isLoadingProjects ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : waves && waves.length > 0 ? (
                  waves.map((wave) => {
                    const project = projects?.find(p => p.id === wave.projectId);
                    return (
                      <TableRow key={wave.id}>
                        <TableCell className="font-mono text-xs">{wave.waveCode}</TableCell>
                        <TableCell className="font-medium">{project?.name || 'N/A'}</TableCell>
                        <TableCell>{formatDate(wave.planningWorkPeriod.endDate)}</TableCell>
                        <TableCell>{wave.manpowerRequirement.reduce((acc, req) => acc + req.count, 0)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No active waves.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt />
              Recent Invoices
            </CardTitle>
            <CardDescription>
              The 5 most recently issued invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInvoices ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                        <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : invoices && invoices.length > 0 ? (
                    invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                            <TableCell className="text-right font-mono">${invoice.totalAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={getInvoiceStatusVariant(invoice.status)}>{invoice.status}</Badge>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">No invoices found.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
