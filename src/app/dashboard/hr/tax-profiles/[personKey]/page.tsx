
'use client';

import { use, useState, useEffect } from 'react';
import { doc, DocumentReference, collection, query, where, getDocs, limit, Firestore } from 'firebase/firestore';
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

/**
 * Finds an employee document by searching various fields based on the personKey.
 * This is more robust than assuming personRefId is always the document ID.
 * @param db Firestore instance
 * @param personType 'OFFICE' or 'MP'
 * @param personRefId The ID to search for
 * @returns The found Employee object or null
 */
async function findEmployeeByPersonKey(db: Firestore, personType: 'OFFICE' | 'MP', personRefId: string): Promise<Employee | null> {
    const employeeTypeQuery = personType === 'OFFICE' ? 'OFFICE' : 'FIELD';
    const employeesRef = collection(db, 'employees');

    // 1. Try fetching by document ID first, as it's the most direct.
    try {
        const docSnap = await getDoc(doc(employeesRef, personRefId));
        if (docSnap.exists() && docSnap.data().employeeType === employeeTypeQuery) {
            return { id: docSnap.id, ...docSnap.data() } as Employee;
        }
    } catch (e) {
        // This can happen if personRefId is not a valid document ID format. Ignore and proceed.
    }

    // 2. Try fetching by employeeCode
    const codeQuery = query(employeesRef, where('employeeCode', '==', personRefId), where('employeeType', '==', employeeTypeQuery), limit(1));
    const codeSnap = await getDocs(codeQuery);
    if (!codeSnap.empty) {
        const doc = codeSnap.docs[0];
        return { id: doc.id, ...doc.data() } as Employee;
    }
    
    // 3. For OFFICE employees, try fetching by userUid as a fallback
    if (personType === 'OFFICE') {
        const userUidQuery = query(employeesRef, where('userUid', '==', personRefId), where('employeeType', '==', 'OFFICE'), limit(1));
        const userUidSnap = await getDocs(userUidQuery);
        if (!userUidSnap.empty) {
            const doc = userUidSnap.docs[0];
            return { id: doc.id, ...doc.data() } as Employee;
        }
    }

    return null; // Not found
}


export default function TaxProfileDetailPage({ params }: { params: Promise<{ personKey: string }> }) {
    const resolvedParams = use(params);
    const { personKey } = resolvedParams;
    const router = useRouter();

    const db = useFirestore();
    const { personType, personRefId } = parsePersonKey(personKey);
    
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
    
    const taxProfileRef = useMemoFirebase(
        () => (db ? (doc(db, "taxProfiles", personKey) as DocumentReference<TaxProfile>) : null),
        [db, personKey]
    );
    
    const { data: taxProfile, isLoading: isLoadingTaxProfile, error: taxProfileError, refetch: refetchTaxProfile } = useDoc<TaxProfile>(taxProfileRef);

    useEffect(() => {
        if (db) {
            setIsLoadingEmployee(true);
            findEmployeeByPersonKey(db, personType, personRefId)
                .then(setEmployee)
                .finally(() => setIsLoadingEmployee(false));
        }
    }, [db, personType, personRefId]);


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
