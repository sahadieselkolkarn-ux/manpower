
'use client';

import { use, useState, useEffect } from 'react';
import { doc, DocumentReference } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import FullPageLoader from '@/components/full-page-loader';
import { Employee } from '@/types/employee';
import { Ly01Form } from '@/components/tax/Ly01Form';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function EmployeeLy01Page({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { id } = resolvedParams;
    const router = useRouter();

    const db = useFirestore();
    const employeeRef = useMemoFirebase(
        () => (db ? (doc(db, "employees", id) as DocumentReference<Employee>) : null),
        [db, id]
    );
    const { data: employee, isLoading, error } = useDoc<Employee>(employeeRef);

    if (isLoading) {
        return <FullPageLoader />;
    }

    if (error) {
        return <div className="p-8 text-destructive">Error: {error.message}</div>
    }

    if (!employee) {
        return <div className="p-8 text-center text-muted-foreground">Employee not found.</div>
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <Button
                variant="ghost"
                onClick={() => router.push(`/dashboard/employees/${id}`)}
                className="mb-4"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Employee Details
            </Button>
            <Ly01Form employee={employee} mode="hr" />
        </div>
    )

}
