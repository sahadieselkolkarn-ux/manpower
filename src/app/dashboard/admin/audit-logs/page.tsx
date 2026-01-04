'use client';

import React, { useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AuditLog } from '@/types/audit-log';
import FullPageLoader from '@/components/full-page-loader';
import { formatDate } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';


export default function AuditLogsPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  
  const logsQuery = useMemoFirebase(() => (db ? query(collection(db, 'audit-logs'), orderBy('timestamp', 'desc')) : null), [db]);
  const { data: logs, isLoading } = useCollection<AuditLog>(logsQuery);

  const isAdmin = userProfile?.isAdmin;

  if (authLoading || isLoading) {
    return <FullPageLoader />;
  }
  
  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="m-4 text-center">
          <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
          <CardContent><p>You do not have permission to view this page.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Audit Logs</h1>
          <p className="text-muted-foreground">A record of significant actions performed in the system.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Entity ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : logs && logs.length > 0 ? (
                logs.map((log) => (
                    <React.Fragment key={log.id}>
                        <TableRow>
                            <TableCell>{formatDate(log.timestamp)}</TableCell>
                            <TableCell>{log.userName}</TableCell>
                            <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                            <TableCell>{log.targetEntity}</TableCell>
                            <TableCell className="font-mono text-xs">{log.targetId}</TableCell>
                        </TableRow>
                        {(log.beforeState || log.afterState) && (
                        <TableRow>
                            <TableCell colSpan={5} className="p-0">
                                <Accordion type="single" collapsible>
                                    <AccordionItem value="item-1" className="border-b-0">
                                        <AccordionTrigger className="text-xs p-2 justify-start gap-2 [&[data-state=open]>svg]:hidden">
                                            Show Details
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50">
                                                <div>
                                                    <h4 className="font-semibold mb-2">Before</h4>
                                                    <pre className="text-xs p-2 bg-background rounded-md overflow-x-auto">
                                                        {JSON.stringify(log.beforeState, null, 2) || 'N/A'}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-2">After</h4>
                                                    <pre className="text-xs p-2 bg-background rounded-md overflow-x-auto">
                                                        {JSON.stringify(log.afterState, null, 2) || 'N/A'}
                                                    </pre>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </TableCell>
                        </TableRow>
                        )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No audit logs found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
