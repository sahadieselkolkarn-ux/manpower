'use client';

import { use, useState } from 'react';
import { doc, DocumentReference } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import FullPageLoader from '@/components/full-page-loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimesheetBatch } from '@/types/timesheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TimesheetLinesTab from './_components/TimesheetLinesTab';
import TimesheetValidateTab from './_components/TimesheetValidateTab';
import TimesheetApproveTab from './_components/TimesheetApproveTab';


export default function TimesheetBatchDetailsPage({ params }: { params: Promise<{ batchId: string }> }) {
    const { batchId } = use(params);
    const db = useFirestore();
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();

    const batchRef = useMemoFirebase(() => db ? (doc(db, 'timesheetBatches', batchId) as DocumentReference<TimesheetBatch>) : null, [db, batchId]);
    const { data: batch, isLoading: isLoadingBatch, error, refetch } = useDoc<TimesheetBatch>(batchRef);

    const canManage = userProfile?.role === 'admin' || userProfile?.role === 'hrManager';
    const isLoading = authLoading || isLoadingBatch;
    
    if (isLoading) {
        return <FullPageLoader />;
    }

    if (!canManage) {
        return <div className="p-8 text-center text-muted-foreground">You do not have permission to access this page.</div>;
    }
    
    if (error) {
        return <div className="p-8 text-destructive">Error loading batch: {error.message}</div>;
    }

    if (!batch) {
        return <div className="p-8 text-center text-muted-foreground">Timesheet batch not found.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <Button variant="ghost" onClick={() => router.push('/dashboard/hr/timesheets')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Batches
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                        <CardTitle>Timesheet Batch: {batch.id}</CardTitle>
                        <CardDescription>
                            Period: {batch.periodStart.toDate().toLocaleDateString()} - {batch.periodEnd.toDate().toLocaleDateString()}
                        </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-lg">{batch.status.replace('_', ' ')}</Badge>
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue="lines" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="lines">1. Lines</TabsTrigger>
                    <TabsTrigger value="validate" disabled={batch.status !== 'CLIENT_APPROVED_RECEIVED' && batch.status !== 'VALIDATED'}>2. Validate</TabsTrigger>
                    <TabsTrigger value="approve" disabled={batch.status !== 'VALIDATED'}>3. Approve</TabsTrigger>
                </TabsList>
                <TabsContent value="lines">
                   <TimesheetLinesTab batch={batch} />
                </TabsContent>
                <TabsContent value="validate">
                    <TimesheetValidateTab batch={batch} onValidationComplete={refetch} />
                </TabsContent>
                <TabsContent value="approve">
                   <TimesheetApproveTab batch={batch} onApprovalComplete={refetch} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

