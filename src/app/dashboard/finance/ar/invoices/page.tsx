
'use client';

import { useState } from 'react';
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
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Invoice } from '@/types/invoice';
import { DollarSign, FileText } from 'lucide-react';
import { getInvoiceStatusVariant, formatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ARPaymentForm from '@/components/forms/ar-payment-form';
import { BankAccount } from '@/types/bank-account';

export default function ARInvoicesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const db = useFirestore();
  const { userProfile } = useAuth();
  
  const canManage = userProfile?.isAdmin || (userProfile?.roleIds || []).includes('FINANCE_MANAGER');

  // Query for invoices that are ready to be paid
  const invoicesQuery = useMemoFirebase(
    () =>
      db
        ? query(
            collection(db, 'invoices'),
            where('status', 'in', ['SENT', 'PARTIAL', 'UNPAID']),
            orderBy('issueDate', 'desc')
          )
        : null,
    [db]
  );
  const { data: invoices, isLoading, refetch } = useCollection<Invoice>(invoicesQuery);

  // Query for active bank accounts for the payment form
  const accountsQuery = useMemoFirebase(
    () => (db ? query(collection(db, 'bankAccounts'), where('active', '==', true)) : null),
    [db]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<BankAccount>(accountsQuery);


  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsFormOpen(true);
  };
  
  const handleSuccess = () => {
    setIsFormOpen(false);
    refetch();
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          A/R Invoices
        </h1>
      </div>
      <p className="text-muted-foreground">
        Track outstanding invoices and record customer payments.
      </p>

      <Tabs defaultValue="all">
        <TabsList>
            <TabsTrigger value="all">All Outstanding</TabsTrigger>
            <TabsTrigger value="manpower">Manpower</TabsTrigger>
            <TabsTrigger value="commercial">Commercial</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
           <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>
                List of all sent and partially paid invoices awaiting payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inv. No.</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Net Receivable</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28 ml-auto" /></TableCell>
                        {canManage && <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>}
                      </TableRow>
                    ))
                  ) : invoices && invoices.length > 0 ? (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{/* clientName would be here */ 'Client Placeholder'}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                           <Badge variant={getInvoiceStatusVariant(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.totalAmount)}
                        </TableCell>
                         <TableCell className="text-right font-mono font-bold">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.netReceivable - (invoice.paidAmount || 0))}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                             <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRecordPayment(invoice)}
                                disabled={invoice.status === 'PAID'}
                              >
                                <DollarSign className="mr-2 h-4 w-4"/>
                                Record Payment
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center">
                        No outstanding invoices found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="manpower">
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground italic">
                <FileText className="h-8 w-8 mb-2"/>
                Manpower invoice filtering will be implemented in a future sprint.
            </div>
         </TabsContent>
        <TabsContent value="commercial">
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground italic">
                <FileText className="h-8 w-8 mb-2"/>
                Commercial invoice filtering will be implemented in a future sprint.
            </div>
        </TabsContent>
      </Tabs>

      {canManage && selectedInvoice && (
        <ARPaymentForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          invoice={selectedInvoice}
          accounts={accounts || []}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
