
'use client';

import { use, useState, useEffect } from 'react';
import { doc, DocumentReference } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import FullPageLoader from '@/components/full-page-loader';
import { Employee } from '@/types/employee';
import { TaxProfile } from '@/types/tax';
import { TaxProfileForm } from '@/components/tax/TaxProfileForm';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getPersonKey, parsePersonKey } from '@/lib/tax/utils';

export default function TaxProfileDetailPage({ params }: { params: Promise<{ personKey: string }> }) {
    const resolvedParams = use(params);
    const { personKey } = resolvedParams;
    const router = useRouter();

    const db = useFirestore();
    
    const { personType, personRefId } = parsePersonKey(personKey);
    const collectionName = 'employees';

    const employeeRef = useMemoFirebase(
        () => (db && personRefId ? (doc(db, collectionName, personRefId) as DocumentReference<Employee>) : null),
        [db, personRefId, collectionName]
    );

    const taxProfileRef = useMemoFirebase(
        () => (db ? (doc(db, "taxProfiles", personKey) as DocumentReference<TaxProfile>) : null),
        [db, personKey]
    );

    const { data: employee, isLoading: isLoadingEmployee, error: employeeError } = useDoc<Employee>(employeeRef);
    const { data: taxProfile, isLoading: isLoadingTaxProfile, error: taxProfileError, refetch: refetchTaxProfile } = useDoc<TaxProfile>(taxProfileRef);

    const isLoading = isLoadingEmployee || isLoadingTaxProfile;
    const error = employeeError || taxProfileError;

    const handleSuccess = () => {
        refetchTaxProfile();
    }

    if (isLoading) {
        return <FullPageLoader />;
    }

    if (error) {
        return <div className="p-8 text-destructive">Error: {error.message}</div>
    }

    if (!employee) {
        return <div className="p-8 text-center text-muted-foreground">Employee profile not found.</div>
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/hr/tax-profiles')}
                className="mb-4"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Tax Profiles
            </Button>
            <TaxProfileForm employee={employee} taxProfile={taxProfile} personKey={personKey} onSuccess={handleSuccess} />
        </div>
    )
}

    