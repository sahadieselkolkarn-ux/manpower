'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Employee, DocumentInfo } from '@/types/employee';
import { differenceInDays, addMonths, startOfToday } from 'date-fns';
import { toDate, formatDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface FlatDocument extends DocumentInfo {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  daysLeft: number | null;
  status: 'Expired' | 'Expiring Soon' | 'Valid';
}

function getStatus(expiryDate: Date | undefined): { status: FlatDocument['status'], daysLeft: number | null } {
  if (!expiryDate) {
    return { status: 'Valid', daysLeft: null };
  }
  const today = startOfToday();
  const sixMonthsFromNow = addMonths(today, 6);
  const daysLeft = differenceInDays(expiryDate, today);

  if (expiryDate < today) {
    return { status: 'Expired', daysLeft };
  }
  if (expiryDate < sixMonthsFromNow) {
    return { status: 'Expiring Soon', daysLeft };
  }
  return { status: 'Valid', daysLeft };
}

function ComplianceTable({ documents, isLoading }: { documents: FlatDocument[], isLoading: boolean }) {
    const router = useRouter();
    return (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Document Name/No.</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={`${doc.employeeId}-${doc.name}-${doc.type}`} className="cursor-pointer" onClick={() => router.push(`/dashboard/employees/${doc.employeeId}`)}>
                    <TableCell>
                      <div className="font-medium">{doc.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{doc.employeeCode}</div>
                    </TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>{doc.name}</TableCell>
                    <TableCell>{doc.expiryDate ? formatDate(doc.expiryDate) : 'N/A'}</TableCell>
                    <TableCell>{doc.daysLeft !== null ? doc.daysLeft : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={doc.status === 'Expired' ? 'destructive' : doc.status === 'Expiring Soon' ? 'secondary' : 'outline'}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No relevant documents found for this filter.</TableCell>
                </TableRow>
              )}
            </TableBody>
        </Table>
    )
}

export default function ComplianceAlertsPage() {
  const db = useFirestore();
  const employeesQuery = useMemoFirebase(() => db ? query(collection(db, 'employees')) : null, [db]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesQuery);

  const allDocuments = useMemo((): FlatDocument[] => {
    if (!employees) return [];

    const flatList: FlatDocument[] = [];
    employees.forEach(emp => {
      if (emp.documents && emp.documents.length > 0) {
        emp.documents.forEach(doc => {
          if (doc.expiryDate) { // Only include documents with an expiry date
            const expiry = toDate(doc.expiryDate);
            const { status, daysLeft } = getStatus(expiry);
            
            flatList.push({
              ...doc,
              employeeId: emp.id,
              employeeName: `${emp.personalInfo.firstName} ${emp.personalInfo.lastName}`,
              employeeCode: emp.employeeCode,
              daysLeft: daysLeft,
              status: status,
            });
          }
        });
      }
    });

    return flatList.sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
  }, [employees]);

  const expiringSoon = allDocuments.filter(d => d.status === 'Expiring Soon');
  const expired = allDocuments.filter(d => d.status === 'Expired');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <AlertCircle />
            Compliance Alerts
          </h1>
          <p className="text-muted-foreground">Proactive alerts for expiring employee documents.</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
            <Tabs defaultValue="expiring">
                <TabsList>
                    <TabsTrigger value="expiring">Expiring Soon ({expiringSoon.length})</TabsTrigger>
                    <TabsTrigger value="expired">Expired ({expired.length})</TabsTrigger>
                    <TabsTrigger value="all">All Documents ({allDocuments.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="expiring" className="mt-4">
                    <ComplianceTable documents={expiringSoon} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="expired" className="mt-4">
                    <ComplianceTable documents={expired} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="all" className="mt-4">
                    <ComplianceTable documents={allDocuments} isLoading={isLoading} />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
