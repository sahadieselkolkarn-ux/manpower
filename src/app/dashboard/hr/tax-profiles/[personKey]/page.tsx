

'use client';

import { use, useState, useEffect } from 'react';
import { doc, DocumentReference, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import FullPageLoader from '@/components/full-page-loader';
import { Employee, Ly01Profile } from '@/types/employee';
import { TaxProfileForm } from '@/components/tax/TaxProfileForm';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
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
import { getYear, getMonth } from 'date-fns';
import { PersonType } from '@/types/tax';

export default function TaxProfileDetailPage({ params }: { params: Promise<{ personKey: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const { toast } = useToast();

    const db = useFirestore();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
    
    const [parsedKey, setParsedKey] = useState<{ personType: PersonType, personRefId: string, canonicalPersonKey: string } | null>(null);
    
    useEffect(() => {
        const pKey = parsePersonKey(resolvedParams.personKey);
        setParsedKey(pKey);
    }, [resolvedParams.personKey]);

    useEffect(() => {
        if (!db || !parsedKey) {
            setIsLoadingEmployee(false);
            return;
        };
        
        setIsLoadingEmployee(true);
        const employeeRef = doc(db, "employees", parsedKey.personRefId);
        
        const unsub = onSnapshot(employeeRef, async (docSnap) => {
             if (docSnap.exists()) {
                const empData = { id: docSnap.id, ...docSnap.data() } as Employee;
                
                if (!empData.taxProfile?.ly01) {
                    console.log(`LY.01 profile for ${empData.employeeCode} not found. Creating draft.`);
                    const now = new Date();
                    const newLy01: Ly01Profile = {
                        status: 'MISSING',
                        version: 1,
                        effectiveMonth: `${getYear(now)}-${String(getMonth(now) + 1).padStart(2, '0')}`,
                        updatedAt: serverTimestamp() as Timestamp,
                        updatedBy: 'SYSTEM_INIT',
                        data: {}
                    };
                    try {
                        await updateDoc(employeeRef, { 'taxProfile.ly01': newLy01 });
                    } catch (e) {
                         console.error("Failed to create draft LY.01 profile:", e);
                         toast({ variant: 'destructive', title: 'Error', description: 'Could not initialize tax profile.' });
                         setEmployee(empData);
                    }
                } else {
                   setEmployee(empData);
                }
            } else {
                setEmployee(null);
            }
             setIsLoadingEmployee(false);
        }, (error) => {
             console.error("Error listening to employee document:", error);
             setIsLoadingEmployee(false);
        });
       
        return () => unsub();

    }, [db, parsedKey, toast]);


    if (isLoadingEmployee) {
        return <FullPageLoader />
    }

    if (!parsedKey) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Button variant="ghost" onClick={() => router.push('/dashboard/hr/tax-profiles')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Tax Profiles
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2"><ShieldAlert />Invalid Profile Key</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>The link you followed seems to be broken or invalid.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                           Raw Key: {resolvedParams.personKey}
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
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
                           - Person Key: {parsedKey?.canonicalPersonKey} <br/>
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
            {employee && (
                <TaxProfileForm 
                    employee={employee}
                />
            )}
        </div>
    )
}
