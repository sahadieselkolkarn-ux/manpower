'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { canManageFinance } from '@/lib/authz';
import { formatDate } from '@/lib/utils';
import { TimesheetBatch } from '@/types/timesheet';
import FullPageLoader from '@/components/full-page-loader';
import { FileCog, FileUp, ShieldAlert, Sparkles, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateInvoiceFromBatch } from '@/lib/billing/billing.service';
import { Invoice } from '@/types/invoice';


interface BatchWithInvoiceStatus extends TimesheetBatch {
  invoiceGenerated: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
}

export default function BillingRunsPage() {
  const db = useFirestore();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchesWithStatus, setBatchesWithStatus] = useState<BatchWithInvoiceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const batchesQuery = useMemoFirebase(
    () =>
      db
        ? query(
            collection(db, 'timesheetBatches'),
            where('status', 'in', ['HR_APPROVED', 'FINANCE_PAID']),
            orderBy('approvedAt', 'desc')
          )
        : null,
    [db]
  );
  const { data: batches, isLoading: isLoadingBatches, refetch } = useCollection<TimesheetBatch>(batchesQuery);

  useEffect(() => {
    if (isLoadingBatches || !batches || !db) {
      if (!isLoadingBatches) setIsLoading(false);
      return;
    }

    const checkInvoiceStatus = async () => {
      setIsLoading(true);
      if (batches.length === 0) {
        setBatchesWithStatus([]);
        setIsLoading(false);
        return;
      }
      
      const batchIds = batches.map(b => b.id);
      const invoicesQuery = query(collection(db, 'invoices'), where('batchId', 'in', batchIds));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoiceMap = new Map<string, Invoice>();
      invoicesSnapshot.forEach(doc => {
          const inv = doc.data() as Invoice;
          if(inv.batchId) {
            invoiceMap.set(inv.batchId, {id: doc.id, ...inv});
          }
      });
      
      const updatedBatches = batches.map(batch => {
          const invoice = invoiceMap.get(batch.id);
          return {
            ...batch,
            invoiceGenerated: !!invoice,
            invoiceId: invoice?.id,
            invoiceNumber: invoice?.invoiceNumber,
          };
      });
      setBatchesWithStatus(updatedBatches);
      setIsLoading(false);
    };

    checkInvoiceStatus();

  }, [batches, isLoadingBatches, db]);

  const handleGenerate = async (batchId: string) => {
    if (!db || !userProfile) return;
    setProcessingId(batchId);
    try {
      const { invoiceId, invoiceNumber } = await generateInvoiceFromBatch(db, userProfile, batchId);
      toast({
        title: 'Success!',
        description: `Invoice ${invoiceNumber} created from batch ${batchId}.`,
      });
      refetch(); // Refetch to update the list
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Could not generate invoice.';
      toast({
        variant: 'destructive',
        title: 'Error Generating Invoice',
        description: errorMessage,
      });
    } finally {
      setProcessingId(null);
    }
  };


  const canAccess = canManageFinance(userProfile);

  if (authLoading) {
    return <FullPageLoader />;
  }

  if (!canAccess) {
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
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Billing Runs
        </h1>
      </div>
      <p className="text-muted-foreground">
        Generate client invoices from approved timesheet batches.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Batches Ready for Billing</CardTitle>
          <CardDescription>
            The following timesheet batches are locked and can be used to generate invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wave ID</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Timesheet Status</TableHead>
                <TableHead>Invoice Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                     <TableCell>
                      <Skeleton className="h-6 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-32" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-32 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : batchesWithStatus.length > 0 ? (
                batchesWithStatus.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-xs">{batch.waveId}</TableCell>
                    <TableCell className="font-medium">
                      {formatDate(batch.periodStart)} - {formatDate(batch.periodEnd)}
                    </TableCell>
                     <TableCell>
                      <Badge variant={batch.status === 'FINANCE_PAID' ? 'default' : 'secondary'}>{batch.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                       {batch.invoiceGenerated ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-600"><Receipt className="mr-2 h-4 w-4" /> {batch.invoiceNumber || 'Generated'}</Badge>
                       ) : (
                          <Badge variant="outline"><FileUp className="mr-2 h-4 w-4"/>Not Generated</Badge>
                       )}
                    </TableCell>
                    <TableCell className="text-right">
                      {batch.invoiceGenerated ? (
                         <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/finance/ar/invoices`)} // Go to invoice list for now
                        >
                            View Invoice
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={processingId === batch.id}
                          onClick={() => handleGenerate(batch.id)}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          {processingId === batch.id ? 'Generating...' : 'Generate Invoice'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No batches are currently ready for billing.
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
