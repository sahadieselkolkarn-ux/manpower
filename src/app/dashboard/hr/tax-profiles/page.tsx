'use client';
import { useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Employee } from '@/types/employee';
import { TaxProfile, TaxProfileStatus } from '@/types/tax';
import { getPersonKey } from '@/lib/tax/utils';
import { formatDate } from '@/lib/utils';
import FullPageLoader from '@/components/full-page-loader';


export default function TaxProfilesListPage() {
    const db = useFirestore();
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'OFFICE' | 'FIELD'>('ALL');
    const [filterStatus, setFilterStatus] = useState<TaxProfileStatus | 'ALL'>('ALL');

    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(
        useMemoFirebase(() => db ? collection(db, 'employees') : null, [db])
    );
    const { data: taxProfiles, isLoading: isLoadingTaxProfiles } = useCollection<TaxProfile>(
        useMemoFirebase(() => db ? collection(db, 'taxProfiles') : null, [db])
    );

    const taxProfileMap = useMemo(() => {
        if (!taxProfiles) return new Map<string, TaxProfile>();
        return new Map(taxProfiles.map(p => [p.personRefId, p]));
    }, [taxProfiles]);

    const filteredEmployees = useMemo(() => {
        if (!employees) return [];
        return employees.filter(emp => {
            const typeMatch = filterType === 'ALL' || emp.employeeType === filterType;
            
            const personKey = getPersonKey(emp.employeeType, emp.id);
            const profile = taxProfileMap.get(emp.id);
            const statusMatch = filterStatus === 'ALL' || (profile?.status || 'NOT_STARTED') === filterStatus;

            const searchTermLower = searchTerm.toLowerCase();
            const nameMatch = `${emp.personalInfo.firstName} ${emp.personalInfo.lastName}`.toLowerCase().includes(searchTermLower);
            const codeMatch = emp.employeeCode?.toLowerCase().includes(searchTermLower);

            return typeMatch && statusMatch && (nameMatch || codeMatch);
        });
    }, [employees, taxProfileMap, filterType, filterStatus, searchTerm]);

    const isLoading = isLoadingEmployees || isLoadingTaxProfiles;

    if (isLoading) {
        return <FullPageLoader />
    }

    const getStatusVariant = (status?: TaxProfileStatus) => {
        switch (status) {
            case 'COMPLETE': return 'default';
            case 'INCOMPLETE': return 'secondary';
            case 'NEEDS_UPDATE': return 'destructive';
            default: return 'outline';
        }
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Card>
                <CardHeader>
                    <CardTitle>L.Y.01 Tax Profiles</CardTitle>
                    <CardDescription>Manage and track the tax deduction profiles for all employees.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <Input 
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="OFFICE">Office</SelectItem>
                                <SelectItem value="FIELD">Manpower</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Statuses</SelectItem>
                                <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                                <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
                                <SelectItem value="COMPLETE">Complete</SelectItem>
                                <SelectItem value="NEEDS_UPDATE">Needs Update</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5" /></TableCell></TableRow>
                                ))
                            ) : filteredEmployees.length > 0 ? (
                                filteredEmployees.map(emp => {
                                    const profile = taxProfileMap.get(emp.id);
                                    const personKey = getPersonKey(emp.employeeType, emp.id);
                                    return (
                                        <TableRow key={emp.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/hr/tax-profiles/${personKey}`)}>
                                            <TableCell><Badge variant="outline">{emp.employeeType}</Badge></TableCell>
                                            <TableCell>{emp.employeeCode}</TableCell>
                                            <TableCell>{`${emp.personalInfo.firstName} ${emp.personalInfo.lastName}`}</TableCell>
                                            <TableCell><Badge variant={getStatusVariant(profile?.status)}>{profile?.status || 'NOT_STARTED'}</Badge></TableCell>
                                            <TableCell>{profile ? formatDate(profile.updatedAt) : '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm">Open</Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-24 text-center">No profiles match the current filters.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
