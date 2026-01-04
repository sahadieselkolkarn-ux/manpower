
'use client';

import { use, useState, useEffect } from 'react';
import { doc, DocumentReference, getDoc } from 'firebase/firestore';
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
import { parsePersonKey } from '@/lib/tax/utils';

export default function TaxProfileDetailPage({ params }: { params: Promise<{ personKey: string }> }) {
    const resolvedParams = use(params);
    const { personKey } = resolvedParams;
    const router = useRouter();

    const db = useFirestore();
    const { personRefId } = parsePersonKey(personKey);
    
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
    
    // Fetch Tax Profile using personKey
    const taxProfileRef = useMemoFirebase(
        () => (db ? (doc(db, "taxProfiles", personKey) as DocumentReference<TaxProfile>) : null),
        [db, personKey]
    );
    const { data: taxProfile, isLoading: isLoadingTaxProfile, error: taxProfileError, refetch: refetchTaxProfile } = useDoc<TaxProfile>(taxProfileRef);

    // Fetch Employee using the parsed docId (personRefId)
    useEffect(() => {
        if (db && personRefId) {
            setIsLoadingEmployee(true);
            const employeeRef = doc(db, "employees", personRefId);
            getDoc(employeeRef).then(docSnap => {
                if (docSnap.exists()) {
                    setEmployee({ id: docSnap.id, ...docSnap.data() } as Employee);
                } else {
                    setEmployee(null);
                }
            }).catch(err => {
                console.error("Error fetching employee doc:", err);
                setEmployee(null);
            }).finally(() => {
                setIsLoadingEmployee(false);
            });
        }
    }, [db, personRefId]);


    const isLoading = isLoadingEmployee || isLoadingTaxProfile;
    const error = taxProfileError; // For now, only show tax profile loading errors

    const handleSuccess = () => {
        refetchTaxProfile();
    }

    if (isLoading) {
        return <FullPageLoader />
    }

    if (error) {
        return <div className="p-8 text-destructive">Error loading tax profile: {error.message}</div>
    }

    if (!employee) {
        return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Button variant="ghost" onClick={() => router.push('/dashboard/hr/tax-profiles')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Tax Profiles
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">Employee profile not found for this tax record ({personKey}). Please check employee data and linkage.</p>
                    </CardContent>
                </Card>
            </div>
        )
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
