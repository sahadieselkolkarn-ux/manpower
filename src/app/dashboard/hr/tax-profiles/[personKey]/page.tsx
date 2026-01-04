
'use client';

import { use, useState, useEffect } from 'react';
import { doc, DocumentReference, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
import { parsePersonKey, getPersonKey } from '@/lib/tax/utils';
import { useToast } from '@/hooks/use-toast';

export default function TaxProfileDetailPage({ params }: { params: Promise<{ personKey: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const { toast } = useToast();

    const db = useFirestore();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
    const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
    const [isLoadingTaxProfile, setIsLoadingTaxProfile] = useState(true);
    
    // Using a state for the parsed key to avoid re-parsing on every render
    const [parsedKey, setParsedKey] = useState<{ personType: 'OFFICE' | 'MP', personRefId: string } | null>(null);
    const [canonicalPersonKey, setCanonicalPersonKey] = useState<string | null>(null);

    useEffect(() => {
        try {
            const pKey = parsePersonKey(resolvedParams.personKey);
            setParsedKey(pKey);
            // Re-build the canonical key to ensure consistency (e.g., always has ':')
            setCanonicalPersonKey(getPersonKey(pKey.personType, pKey.personRefId));
        } catch (error) {
            console.error("Invalid personKey:", error);
            // Handle invalid key error, maybe redirect or show error page
        }
    }, [resolvedParams.personKey]);

    // Fetch Employee using the parsed docId (personRefId)
    useEffect(() => {
        if (!db || !parsedKey) return;
        
        setIsLoadingEmployee(true);
        const employeeRef = doc(db, "employees", parsedKey.personRefId);
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
    }, [db, parsedKey]);

    // Fetch or Create Tax Profile using the canonical personKey
    useEffect(() => {
        if (!db || !canonicalPersonKey || !employee) return;

        setIsLoadingTaxProfile(true);
        const taxProfileRef = doc(db, "taxProfiles", canonicalPersonKey);

        const unsub = onSnapshot(taxProfileRef, async (docSnap) => {
             if (docSnap.exists()) {
                setTaxProfile({ id: docSnap.id, ...docSnap.data() } as TaxProfile);
             } else {
                // If it doesn't exist, create a draft and set it
                console.log(`Tax profile for ${canonicalPersonKey} not found. Creating draft.`);
                const newProfile: Omit<TaxProfile, 'id'> = {
                    personKey: canonicalPersonKey,
                    personType: employee.employeeType as 'OFFICE' | 'MP',
                    personRefId: employee.id,
                    status: 'NOT_STARTED',
                    updatedAt: serverTimestamp() as any,
                    updatedBy: 'SYSTEM_INIT',
                    verifiedBySelf: false,
                    personal: {
                        fullName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
                    },
                    tax: {}
                };
                try {
                    await setDoc(taxProfileRef, newProfile);
                    // The listener will pick up the new doc, so we don't need to manually set state here.
                } catch(e) {
                    console.error("Failed to create draft tax profile:", e);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not initialize tax profile.' });
                }
             }
             setIsLoadingTaxProfile(false);
        }, (error) => {
            console.error("Error listening to tax profile:", error);
            setIsLoadingTaxProfile(false);
        });
       
        return () => unsub();

    }, [db, canonicalPersonKey, employee, toast]);


    const isLoading = isLoadingEmployee || isLoadingTaxProfile;
    
    if (isLoading) {
        return <FullPageLoader />
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
                        <CardTitle className="text-destructive">Error: Employee Not Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>The employee profile could not be found for this tax record.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                           Debug Info: <br/>
                           - Person Key: {canonicalPersonKey} <br/>
                           - Queried Collection: /employees <br/>
                           - Queried Document ID: {parsedKey?.personRefId}
                        </p>
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
            {canonicalPersonKey && (
                <TaxProfileForm 
                    employee={employee} 
                    taxProfile={taxProfile} 
                    personKey={canonicalPersonKey} 
                    onSuccess={() => { /* Real-time listener handles updates */ }} 
                />
            )}
        </div>
    )
}
