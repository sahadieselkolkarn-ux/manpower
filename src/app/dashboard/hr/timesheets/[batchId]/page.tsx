'use client';

import { use, useState } from 'react';
import { doc, DocumentReference, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import FullPageLoader from '@/components/full-page-loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldAlert, CheckCircle, Banknote, FileCheck, CircleDashed, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimesheetBatch } from '@/types/timesheet';
import TimesheetLinesTab from './_components/TimesheetLinesTab';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import FinancePaidForm from './_components/FinancePaidForm';

function getStatusInfo(status: TimesheetBatch['status']) {
    switch (status) {
        case 'DRAFT':
            return { variant: 'outline', icon: <CircleDashed className="mr-2 h-4 w-4" />, text: 'Draft' };
        case 'HR_APPROVED':
            return { variant: 'secondary', icon: <FileCheck className="mr-2 h-4 w-4" />, text: 'HR Approved' };
        case 'FINANCE_PAID':
            return { variant: 'default', icon: <Banknote className="mr-2 h-4 w-4" />, text: 'Finance Paid' };
        default:
            return { variant: 'outline', icon: <CircleDashed className="mr-2 h-4 w-4" />, text: status };
    }
}


export default function TimesheetBatchDetailsPage({ params }: { params: Promise<{ batchId: string }> }) {
    const { batchId } = use(params);
    const db = useFirestore();
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [isApproving, setIsApproving] = useState(false);
    const [isPaidFormOpen, setIsPaidFormOpen] = useState(false);

    const batchRef = useMemoFirebase(() => db ? (doc(db, 'timesheetBatches', batchId) as DocumentReference<TimesheetBatch>) : null, [db, batchId]);
    const { data: batch, isLoading: isLoadingBatch, error, refetch } = useDoc<TimesheetBatch>(batchRef);

    const isLoading = authLoading || isLoadingBatch;
    
    const canManageHR = userProfile?.isAdmin || (userProfile?.roleIds || []).includes('HR_MANAGER');
    const canManageFinance = userProfile?.isAdmin || (userProfile?.roleIds || []).includes('FINANCE_MANAGER');
    
    const isLocked = batch?.status === 'HR_APPROVED' || batch?.status === 'FINANCE_PAID';

    const handleApprove = async () => {
        if (!db || !userProfile || !batch || batch.status !== 'DRAFT') return;
        setIsApproving(true);
        const batchRef = doc(db, 'timesheetBatches', batch.id);

        try {
            await writeBatch(db)
                .update(batchRef, {
                    status: 'HR_APPROVED',
                    approvedAt: serverTimestamp(),
                    approvedBy: userProfile.displayName || userProfile.uid,
                })
                .commit();
            toast({ title: 'Success', description: 'Batch approved and locked.' });
            refetch();
        } catch (error) {
            console.error("Error approving batch:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not approve batch.' });
        } finally {
            setIsApproving(false);
        }
    }

    if (isLoading) {
        return <FullPageLoader />;
    }

    if (!canManageHR && !canManageFinance) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="m-4 text-center">
                <CardHeader><CardTitle className="flex items-center justify-center gap-2"><ShieldAlert className="text-destructive" />Access Denied</CardTitle></CardHeader>
                <CardContent><p>You do not have permission to access this page.</p></CardContent>
                </Card>
            </div>
        );
    }
    
    if (error) {
        return <div className="p-8 text-destructive">Error loading batch: {error.message}</div>;
    }

    if (!batch) {
        return <div className="p-8 text-center text-muted-foreground">Timesheet batch not found.</div>;
    }

    const statusInfo = getStatusInfo(batch.status);

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
                        <CardTitle className="text-2xl">Timesheet Batch: {batch.id}</CardTitle>
                        <CardDescription>
                            Period: {batch.periodStart.toDate().toLocaleDateString()} - {batch.periodEnd.toDate().toLocaleDateString()}
                        </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                             <Badge variant={statusInfo.variant} className="text-base px-4 py-2">
                                {statusInfo.icon}
                                {statusInfo.text}
                            </Badge>
                            <div className="space-x-2">
                            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
                            {canManageHR && batch.status === 'DRAFT' && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                            <CheckCircle className="mr-2 h-4 w-4" /> Approve & Lock
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will lock the batch from further edits by HR and make it available for Finance. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleApprove} disabled={isApproving}>
                                                {isApproving ? 'Approving...' : 'Yes, Approve'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                            {canManageFinance && batch.status === 'HR_APPROVED' && (
                                <Button size="sm" variant="secondary" onClick={() => setIsPaidFormOpen(true)}>
                                    <Banknote className="mr-2 h-4 w-4"/> Mark as Paid
                                </Button>
                            )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <TimesheetLinesTab batch={batch} isLocked={isLocked} />

            {canManageFinance && batch && (
                <FinancePaidForm 
                    open={isPaidFormOpen}
                    onOpenChange={setIsPaidFormOpen}
                    batch={batch}
                    onSuccess={refetch}
                />
            )}
        </div>
    );
}
