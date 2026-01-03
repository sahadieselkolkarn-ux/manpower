'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TimesheetBatch } from '@/types/timesheet';
import { useToast } from '@/hooks/use-toast';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from '@/components/ui/alert-dialog';

interface TimesheetApproveTabProps {
    batch: TimesheetBatch;
    onApprovalComplete: () => void;
}

export default function TimesheetApproveTab({ batch, onApprovalComplete }: TimesheetApproveTabProps) {
    const [isLoading, setIsLoading] = useState(false);
    const db = useFirestore();
    const { toast } = useToast();
    const { userProfile } = useAuth();
    
    const handleApprove = async () => {
        if (!db || !userProfile) return;
        setIsLoading(true);

        const batchRef = doc(db, 'timesheetBatches', batch.id);

        try {
            const firestoreBatch = writeBatch(db);
            firestoreBatch.update(batchRef, {
                status: 'HR_APPROVED',
                approvedAt: serverTimestamp(),
                approvedBy: userProfile.displayName || 'DEV',
            });
            await firestoreBatch.commit();
            toast({ title: 'Success', description: 'Batch approved and locked.' });
            onApprovalComplete();
        } catch (error) {
            console.error('Error approving batch:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not approve batch.' });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle>Approve & Lock Batch</CardTitle>
                <CardDescription>
                    This is the final step. Approving this batch will lock all associated lines from further editing
                    and make them available for financial processing (Payroll/Invoicing).
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={isLoading || batch.status !== 'VALIDATED'}
                        >
                            {isLoading ? 'Approving...' : 'Approve & Lock Batch'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently lock the timesheet batch and all its lines.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleApprove} className="bg-green-600 hover:bg-green-700">Yes, Approve</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
