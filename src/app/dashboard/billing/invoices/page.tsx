
'use client';

import { useState } from 'react';
import { useRouter }from 'next/navigation';
import { collection, query, orderBy } from 'firebase/firestore';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { formatDate, getInvoiceStatusVariant } from '@/lib/utils';
import { Invoice } from '@/types/invoice';
import { Client } from '@/types/client';

export default function InvoicesPage() {
  const db = useFirestore();
  const router = useRouter();

  const { data: invoices, isLoading: isLoadingInvoices } = useCollection<Invoice>(
    useMemoFirebase(() => (db ? query(collection(db, 'invoices'), orderBy('issueDate', 'desc')) : null), [db])
  );

  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(
    useMemoFirebase(() => (db ? collection(db, 'clients') : null), [db])
  );
  
  const clientMap = new Map(clients?.map(c => [c.id, c.name]));
  const isLoading = isLoadingInvoices || isLoadingClients;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Invoices</h1>
          <p className="text-muted-foreground">View and manage invoices generated from billing runs.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>List of all invoices generated in the system.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                            </TableRow>
                        ))
                    ) : invoices && invoices.length > 0 ? (
                        invoices.map(invoice => (
                            <TableRow key={invoice.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/billing/invoices/${invoice.id}`)}>
                                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                <TableCell>{clientMap.get(invoice.clientId) || 'Unknown Client'}</TableCell>
                                <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                                <TableCell><Badge variant={getInvoiceStatusVariant(invoice.status)}>{invoice.status}</Badge></TableCell>
                                <TableCell className="text-right font-mono">{invoice.totalAmount.toLocaleString('en-US', { style: 'currency', currency: 'THB' })}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">No invoices found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
