
'use client';

import { use, useState } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Invoice, InvoiceStatus } from '@/types/invoice';
import { Client } from '@/types/client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FullPageLoader from '@/components/full-page-loader';
import { ArrowLeft, Download, ShieldAlert } from 'lucide-react';
import { formatDate, getInvoiceStatusVariant } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { canManageFinance } from '@/lib/authz';

function FinancialsCard({ invoice }: { invoice: Invoice }) {
  const formatCurrency = (value?: number) => {
    return (value || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{formatCurrency(invoice.subtotal)}</span></div>
        <div className="flex justify-between"><span>VAT (7%)</span><span className="font-mono">{formatCurrency(invoice.vatAmount)}</span></div>
        <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span className="font-mono">{formatCurrency(invoice.totalAmount)}</span></div>
        {invoice.whtAmount && (
          <div className="flex justify-between text-muted-foreground"><span className="pl-4">- WHT (3%)</span><span className="font-mono">({formatCurrency(invoice.whtAmount)})</span></div>
        )}
        <div className="flex justify-between font-bold border-t pt-2 text-lg"><span>Net Receivable</span><span className="font-mono">{formatCurrency(invoice.netReceivable)}</span></div>
        <div className="flex justify-between text-green-600"><span className="pl-4">Amount Paid</span><span className="font-mono">{formatCurrency(invoice.paidAmount)}</span></div>
        <div className="flex justify-between text-green-600"><span className="pl-4">WHT Received</span><span className="font-mono">{formatCurrency(invoice.whtReceivedAmount)}</span></div>
        <div className="flex justify-between font-bold border-t pt-2 text-destructive"><span>Balance Due</span><span className="font-mono">{formatCurrency(invoice.netReceivable - (invoice.paidAmount || 0))}</span></div>
      </CardContent>
    </Card>
  );
}

export default function InvoiceDetailsPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const { userProfile, loading: authLoading } = useAuth();

  const canManage = canManageFinance(userProfile);

  const invoiceRef = useMemoFirebase(() => (db ? doc(db, 'invoices', invoiceId) : null), [db, invoiceId]);
  const { data: invoice, isLoading, error, refetch } = useDoc<Invoice>(invoiceRef);

  const clientRef = useMemoFirebase(() => (db && invoice ? doc(db, 'clients', invoice.clientId) : null), [db, invoice]);
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientRef);

  const handleChangeStatus = async (newStatus: InvoiceStatus) => {
    if (!invoiceRef || !canManage) return;

    try {
        await updateDoc(invoiceRef, { status: newStatus, updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: `Invoice status updated to ${newStatus}.`});
        refetch();
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  };

  if (isLoading || authLoading || isLoadingClient) {
    return <FullPageLoader />;
  }

  if (error || !invoice) {
    return <div className="p-8 text-destructive">Error: {error?.message || 'Invoice not found.'}</div>;
  }
   if (!canManage) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to view this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
          </Button>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Invoice {invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground">Client: {client?.name || invoice.clientId}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
            <Badge variant={getInvoiceStatusVariant(invoice.status)} className="text-lg">{invoice.status}</Badge>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toast({ title: 'Coming soon!', description: 'PDF export is under development.'})}>
                    <Download className="mr-2 h-4 w-4"/> Export PDF
                </Button>
                {invoice.status === 'DRAFT' && <Button size="sm" onClick={() => handleChangeStatus('SENT')}>Mark as Sent</Button>}
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
             <Card>
                <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center p-8">Line item details are not yet implemented.</p>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <FinancialsCard invoice={invoice} />
             <Card>
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                    <p><strong>Issue Date:</strong> {formatDate(invoice.issueDate)}</p>
                    <p><strong>Due Date:</strong> {formatDate(invoice.dueDate)}</p>
                    <p><strong>Timesheet Batch:</strong> {invoice.batchId}</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
