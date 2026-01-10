
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  collectionGroup,
  doc,
  getDoc,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { format, parse, isValid, differenceInDays } from 'date-fns';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CircleAlert, BadgeCheck, Check, X, Shield, FileText } from 'lucide-react';
import FullPageLoader from '@/components/full-page-loader';
import { WaveWithProject, ManpowerRequirement } from '@/types/wave';
import { Employee, DocumentInfo, WorkHistoryItem } from '@/types/employee';
import { Assignment, EligibilityStatus } from '@/types/assignment';
import { Textarea } from '@/components/ui/textarea';
import { toDate, formatDate } from '@/lib/utils';
import { ManpowerPosition } from '@/types/position';
import { CertificateType } from '@/types/certificate-type';
import { CooldownPolicy } from '@/types/cooldown-policy';
import { Contract, ContractSaleRate } from '@/types/contract';
import { Project } from '@/types/project';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formSchema = z.object({
  waveId: z.string().min(1, 'A wave must be selected.'),
  positionId: z.string().min(1, 'A position must be selected.'),
  employeeIds: z.array(z.string()).min(1, 'At least one employee must be selected.'),
  notes: z.string().optional(),
});

interface EligibilityResult {
    passport: { status: EligibilityStatus; details: string[] };
    certificates: { status: EligibilityStatus; details: string[] };
    skills: { status: EligibilityStatus; details: string[] };
    cooldown: { status: EligibilityStatus; details: string[]; required?: number; actual?: number; version?: string; pair?: string; };
    overall: EligibilityStatus;
}

function NewAssignmentFormComponent() {
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedWaveData, setSelectedWaveData] = useState<{ project: Project; contract: Contract; cooldownPolicy: CooldownPolicy | null } | null>(null);
  const [eligibilityResults, setEligibilityResults] = useState<Map<string, EligibilityResult>>(new Map());

  // --- Data Fetching ---
  const wavesQuery = useMemoFirebase(() => db ? query(collectionGroup(db, 'waves'), orderBy('createdAt', 'desc')) : null, [db]);
  const { data: waves, isLoading: isLoadingWaves } = useCollection<WaveWithProject>(wavesQuery);

  const manpowerQuery = useMemoFirebase(() => db ? query(collection(db, 'employees'), where('employeeType', '==', 'FIELD'), where('employmentStatus', '==', 'Active')) : null, [db]);
  const { data: manpower, isLoading: isLoadingManpower } = useCollection<Employee>(manpowerQuery);
  
  const manpowerPositionsQuery = useMemoFirebase(() => db ? query(collection(db, 'manpowerPositions')) : null, [db]);
  const { data: manpowerPositions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(manpowerPositionsQuery);
  const positionMap = useMemo(() => new Map(manpowerPositions?.map(p => [p.id, p.name])), [manpowerPositions]);

  const certificateTypesQuery = useMemoFirebase(() => db ? query(collection(db, 'certificateTypes')) : null, [db]);
  const { data: certificateTypes, isLoading: isLoadingCerts } = useCollection<CertificateType>(certificateTypesQuery);

  const assignmentsQuery = useMemoFirebase(() => db ? query(collection(db, 'assignments'), where('status', '==', 'ACTIVE')) : null, [db]);
  const { data: activeAssignments, isLoading: isLoadingAssignments } = useCollection<Assignment>(assignmentsQuery);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { waveId: searchParams.get('waveId') || '', positionId: '', employeeIds: [], notes: '' },
  });

  const selectedWaveId = form.watch('waveId');
  const selectedPositionId = form.watch('positionId');
  const selectedWave = useMemo(() => waves?.find(w => w.id === selectedWaveId), [waves, selectedWaveId]);

  // --- Derived Data & Memos ---
  const assignedCountsByPosition = useMemo(() => {
    const counts = new Map<string, number>();
    if (!activeAssignments || !selectedWaveId) return counts;
    for (const assignment of activeAssignments) {
        if (assignment.waveId === selectedWaveId) {
            counts.set(assignment.positionId, (counts.get(assignment.positionId) || 0) + 1);
        }
    }
    return counts;
  }, [activeAssignments, selectedWaveId]);
  
  const selectedRequirement = useMemo(() => {
    return selectedWave?.manpowerRequirement.find(r => r.positionId === selectedPositionId);
  }, [selectedWave, selectedPositionId]);

  const remainingSlots = useMemo(() => {
      if (!selectedRequirement) return 0;
      const assigned = assignedCountsByPosition.get(selectedPositionId) || 0;
      return Math.max(0, selectedRequirement.count - assigned);
  }, [selectedRequirement, assignedCountsByPosition, selectedPositionId]);


  // --- Effects ---

  useEffect(() => {
    form.setValue('positionId', '');
    form.setValue('employeeIds', []);
    const waveId = searchParams.get('waveId');
    if (waveId) form.setValue('waveId', waveId);
  }, [searchParams, form]);

  useEffect(() => {
    if (!selectedWaveId) {
      setSelectedWaveData(null);
      return;
    }
    const fetchWaveContext = async () => {
        if (!db || !selectedWave) return;
        const pathSegments = selectedWave.path.split('/');
        const [clientId, contractId, projectId] = [pathSegments[1], pathSegments[3], pathSegments[5]];

        const projectRef = doc(db, 'clients', clientId, 'contracts', contractId, 'projects', projectId);
        const contractRef = doc(db, 'clients', clientId, 'contracts', contractId);
        const waveStartDate = selectedWave.planningWorkPeriod.startDate.toDate();
        const policyQuery = query(collection(db, 'cooldownPolicies'), where('effectiveFrom', '<=', waveStartDate), orderBy('effectiveFrom', 'desc'), limit(1));
        
        const [projectSnap, contractSnap, policySnap] = await Promise.all([getDoc(projectRef), getDoc(contractRef), getDocs(policyQuery)]);
        
        setSelectedWaveData({
            project: projectSnap.exists() ? { id: projectSnap.id, ...projectSnap.data() } as Project : null,
            contract: contractSnap.exists() ? { id: contractSnap.id, ...contractSnap.data() } as Contract : null,
            cooldownPolicy: policySnap.empty ? null : { id: policySnap.docs[0].id, ...policySnap.docs[0].data() } as CooldownPolicy
        });
    }
    fetchWaveContext();
  }, [selectedWaveId, selectedWave, db]);


  // --- Main Eligibility Calculation Effect ---
  useEffect(() => {
    if (!selectedRequirement || !manpower || !selectedWaveData) {
      setEligibilityResults(new Map());
      return;
    }
    
    const { cooldownPolicy, project } = selectedWaveData;

    const newResults = new Map<string, EligibilityResult>();

    const checkPassport = (employee: Employee): { status: EligibilityStatus; details: string[] } => {
        const passport = employee.documents?.find(d => d.type === 'Passport');
        if (!passport?.expiryDate) return { status: 'PASS', details: [] };
        const expiry = toDate(passport.expiryDate);
        if (!expiry || !isValid(expiry)) return { status: 'PASS', details: [] };
        const today = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(today.getMonth() + 6);
        if (expiry < today) return { status: 'FAIL', details: [`Passport expired on ${formatDate(expiry)}`] };
        if (expiry < sixMonthsFromNow) return { status: 'ALERT', details: [`Passport expires soon on ${formatDate(expiry)}`] };
        return { status: 'PASS', details: [] };
    };

    const checkCertificates = (employee: Employee, req: ManpowerRequirement): { status: EligibilityStatus; details: string[] } => {
        if (!req.requiredCertificateIds || req.requiredCertificateIds.length === 0) return { status: 'PASS', details: [] };
        const employeeCerts = new Set(employee.documents?.filter(d => d.type === 'Certificate').map(d => d.certificateTypeId));
        const missing = req.requiredCertificateIds.filter(id => !employeeCerts.has(id));
        if (missing.length > 0) {
            return { status: 'FAIL', details: missing.map(id => `Missing cert: ${certificateTypes?.find(c=>c.id===id)?.name || id}`) };
        }
        // Check expiry for existing certs
        let finalStatus: EligibilityStatus = 'PASS';
        const details: string[] = [];
        req.requiredCertificateIds.forEach(id => {
            const certDoc = employee.documents?.find(d => d.certificateTypeId === id);
            if (certDoc?.expiryDate) {
                 const expiry = toDate(certDoc.expiryDate);
                 if (expiry && isValid(expiry)) {
                    if (expiry < new Date()) {
                        finalStatus = 'FAIL';
                        details.push(`Cert '${certDoc.name}' expired`);
                    } else if (expiry < new Date(new Date().setMonth(new Date().getMonth() + 6)) && finalStatus !== 'FAIL') {
                        finalStatus = 'ALERT';
                    }
                 }
            }
        });
        return { status: finalStatus, details };
    };
    
    const checkSkills = (employee: Employee, req: ManpowerRequirement): { status: EligibilityStatus; details: string[] } => {
        if (!req.requiredSkillTags || req.requiredSkillTags.length === 0) return { status: 'PASS', details: [] };
        const employeeSkills = new Set(employee.skillTags || []);
        const missing = req.requiredSkillTags.filter(tag => !employeeSkills.has(tag));
        if (missing.length > 0) return { status: 'FAIL', details: [`Missing skills: ${missing.join(', ')}`] };
        return { status: 'PASS', details: [] };
    };

    const checkCooldown = (employee: Employee): ReturnType<typeof checkPassport> & { required?: number; actual?: number; version?: string; pair?: string; } => {
        if (!cooldownPolicy || !employee.workHistory || employee.workHistory.length === 0) return { status: 'PASS', details: [] };
        const sortedHistory = [...employee.workHistory].sort((a, b) => (toDate(b.actualEndDate)?.getTime() || 0) - (toDate(a.actualEndDate)?.getTime() || 0));
        const lastWork = sortedHistory[0];
        const lastEndDate = toDate(lastWork.actualEndDate);
        const newStartDate = toDate(selectedWave.planningWorkPeriod.startDate);
        if (!lastEndDate || !newStartDate || !lastWork.workMode || !project?.workMode) return { status: 'ALERT', details: ['Cannot determine cooldown.'] };
        
        const restDays = differenceInDays(newStartDate, lastEndDate);
        const workModePair = `${lastWork.workMode.toLowerCase()}_to_${project.workMode.toLowerCase()}` as keyof CooldownPolicy['matrix'];
        const requiredRestDays = cooldownPolicy.matrix[workModePair] ?? 0;
        
        if (restDays < requiredRestDays) {
            return { status: 'FAIL', details: [`Cooldown not met. Required: ${requiredRestDays}, Actual: ${restDays}`], required: requiredRestDays, actual: restDays, version: cooldownPolicy.policyVersion, pair: workModePair };
        }
        return { status: 'PASS', details: [], required: requiredRestDays, actual: restDays, version: cooldownPolicy.policyVersion, pair: workModePair };
    };
    
    manpower.forEach(emp => {
      const passport = checkPassport(emp);
      const certificates = checkCertificates(emp, selectedRequirement);
      const skills = checkSkills(emp, selectedRequirement);
      const cooldown = checkCooldown(emp);
      let overall: EligibilityStatus = 'PASS';
      if (passport.status === 'FAIL' || certificates.status === 'FAIL' || skills.status === 'FAIL' || cooldown.status === 'FAIL') {
        overall = 'FAIL';
      } else if (passport.status === 'ALERT' || certificates.status === 'ALERT' || cooldown.status === 'ALERT') {
        overall = 'ALERT';
      }
      newResults.set(emp.id, { passport, certificates, skills, cooldown, overall });
    });

    setEligibilityResults(newResults);
    
  }, [manpower, selectedRequirement, selectedWaveData, certificateTypes, selectedWave]);


  const availableEmployees = useMemo(() => {
    if (!manpower || !selectedPositionId) return [];
    
    const assignedInWave = new Set(
      activeAssignments
        ?.filter(a => a.waveId === selectedWaveId)
        .map(a => a.employeeId)
    );

    return manpower
      .filter(emp => !assignedInWave.has(emp.id))
      .filter(emp => emp.positionIds?.includes(selectedPositionId));

  }, [manpower, activeAssignments, selectedWaveId, selectedPositionId]);
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!db || !userProfile || !selectedWave || !selectedWaveData?.contract || !selectedWaveData?.project) {
        toast({ variant: 'destructive', title: 'Error', description: 'Wave context not fully loaded.' });
        return;
    }
    setLoading(true);

    const { contract, project } = selectedWaveData;
    const workMode = String(project.workMode || '').trim().toLowerCase();
    const saleRateInfo = contract.saleRates?.find(r => r.positionId === values.positionId);

    if (!saleRateInfo) {
      toast({ variant: 'destructive', title: 'Assignment Blocked', description: 'ตำแหน่งนี้ยังไม่ได้กำหนดราคาในสัญญา' });
      setLoading(false);
      return;
    }
    
    const getSellRate = (rateInfo: ContractSaleRate, mode: string) => {
        const legacy = Number(rateInfo.dailyRateExVat ?? 0);
        if (mode === 'onshore') return Number(rateInfo.onshoreSellDailyRateExVat ?? legacy);
        if (mode === 'offshore') return Number(rateInfo.offshoreSellDailyRateExVat ?? legacy);
        return legacy;
    };

    const sellRate = getSellRate(saleRateInfo, workMode);

    if (!Number.isFinite(sellRate) || sellRate <= 0) {
        toast({ variant: 'destructive', title: 'Assignment Blocked', description: 'ราคาขายของตำแหน่งนี้สำหรับโหมดงาน (Onshore/Offshore) เป็น 0 กรุณาแก้ที่สัญญา' });
        setLoading(false);
        return;
    }

    try {
      const batch = writeBatch(db);
      for (const employeeId of values.employeeIds) {
        const employee = manpower?.find(e => e.id === employeeId);
        const position = manpowerPositions?.find(p => p.id === values.positionId);
        const eligibility = eligibilityResults.get(employeeId);
        if (!employee || !position || !eligibility) continue;

        const assignmentId = `${values.waveId}_${employeeId}`;
        const assignmentRef = doc(db, 'assignments', assignmentId);

        const assignmentData: Omit<Assignment, 'id'> = {
          waveId: values.waveId,
          projectId: project.id,
          clientId: contract.clientId,
          contractId: contract.id,
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
          employeeType: 'FIELD',
          positionId: values.positionId,
          positionName: position.name,
          workMode: project.workMode,
          status: 'ACTIVE',
          startDate: format(selectedWave.planningWorkPeriod.startDate.toDate(), 'yyyy-MM-dd'),
          endDate: format(selectedWave.planningWorkPeriod.endDate.toDate(), 'yyyy-MM-dd'),
          notes: values.notes || '',
          assignedAt: serverTimestamp() as Timestamp,
          assignedBy: userProfile.displayName || 'DEV',
          sellRateAtSnapshot: sellRate,
          eligibility: {
            passportStatus: eligibility.passport.status,
            certificateStatus: eligibility.certificates.status,
            cooldownStatus: eligibility.cooldown.status,
            overall: eligibility.overall,
            details: [...eligibility.passport.details, ...eligibility.certificates.details, ...eligibility.skills.details, ...eligibility.cooldown.details],
          },
          policyVersion: eligibility.cooldown.version,
          workModePair: eligibility.cooldown.pair,
          appliedRestDays: eligibility.cooldown.required,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        };
        batch.set(assignmentRef, assignmentData, { merge: true });
        
        // Also write to nested collection for compatibility
        const nestedAssignmentRef = doc(db, selectedWave.path, 'assignments', assignmentId);
        batch.set(nestedAssignmentRef, assignmentData, { merge: true });
      }

      await batch.commit();
      toast({ title: 'Success', description: 'Assignments created/updated successfully.' });
      router.push(`/dashboard/clients/${selectedWaveData.contract.clientId}/contracts/${selectedWaveData.contract.id}/projects/${selectedWaveData.project.id}/waves/${selectedWaveId}`);

    } catch (error) {
      console.error('Error creating assignments:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create assignments.' });
    } finally {
      setLoading(false);
    }
  };

  const isLoading = authLoading || isLoadingWaves || isLoadingManpower || isLoadingAssignments || isLoadingPositions || isLoadingCerts;

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
      <Card>
        <CardHeader><CardTitle>Create New Assignments</CardTitle><CardDescription>Select a wave and assign one or more manpower employees.</CardDescription></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="waveId" render={({ field }) => (
                  <FormItem><FormLabel>1. Select Wave</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); form.setValue('positionId', ''); }} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Choose a wave..." /></SelectTrigger></FormControl>
                      <SelectContent>{waves?.map(w => <SelectItem key={w.id} value={w.id}>{w.waveCode}</SelectItem>)}</SelectContent>
                    </Select>
                  <FormMessage />
                  </FormItem>
              )} />

              {selectedWaveId && (
                <FormField control={form.control} name="positionId" render={({ field }) => (
                  <FormItem><FormLabel>2. Select Position</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); form.setValue('employeeIds', []); }} value={field.value}>
                       <FormControl><SelectTrigger><SelectValue placeholder="Choose a position from the wave..." /></SelectTrigger></FormControl>
                       <SelectContent>
                          {selectedWave?.manpowerRequirement.map(req => {
                            const assigned = assignedCountsByPosition.get(req.positionId) || 0;
                            const remaining = Math.max(0, req.count - assigned);
                            return (
                                <SelectItem key={req.positionId} value={req.positionId} disabled={remaining === 0}>
                                    {positionMap.get(req.positionId) || req.positionId} ({remaining} of {req.count} slots left)
                                </SelectItem>
                            );
                          })}
                       </SelectContent>
                    </Select>
                  <FormMessage />
                  </FormItem>
                )}/>
              )}

              {selectedPositionId && (
                <div className="space-y-2">
                  <FormLabel>3. Select Employees ({remainingSlots} slots available)</FormLabel>
                   <ScrollArea className="h-64 rounded-md border">
                    <Table><TableHeader><TableRow>
                        <TableHead className="w-[50px]">
                           <Checkbox
                                onCheckedChange={(checked) => {
                                    const eligibleIds = availableEmployees.filter(e => eligibilityResults.get(e.id)?.overall !== 'FAIL').map(e => e.id);
                                    const toSelect = eligibleIds.slice(0, remainingSlots);
                                    form.setValue('employeeIds', checked ? toSelect : []);
                                }}
                                checked={availableEmployees.length > 0 && form.getValues('employeeIds').length > 0 && form.getValues('employeeIds').length >= Math.min(remainingSlots, availableEmployees.filter(e => eligibilityResults.get(e.id)?.overall !== 'FAIL').length)}
                                disabled={remainingSlots === 0}
                           />
                        </TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Eligibility</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                        {availableEmployees.map(emp => {
                           const eligibility = eligibilityResults.get(emp.id);
                           const isFail = eligibility?.overall === 'FAIL';
                           const isSelected = form.getValues('employeeIds').includes(emp.id);
                           const canSelect = !isFail && (isSelected || form.getValues('employeeIds').length < remainingSlots);

                           return (
                               <TableRow key={emp.id} data-state={isSelected ? "selected" : ""}>
                                <TableCell>
                                    <Checkbox
                                        checked={isSelected}
                                        disabled={isFail || !canSelect}
                                        onCheckedChange={(checked) => {
                                            form.setValue('employeeIds', checked ? [...form.getValues('employeeIds'), emp.id] : form.getValues('employeeIds').filter(id => id !== emp.id));
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div>{emp.personalInfo.firstName} {emp.personalInfo.lastName}</div>
                                    <div className="text-xs text-muted-foreground">{emp.employeeCode}</div>
                                </TableCell>
                                <TableCell>
                                  {eligibility ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className='flex items-center'>
                                            {eligibility.overall === 'PASS' && <BadgeCheck className="h-5 w-5 text-green-600"/>}
                                            {eligibility.overall === 'ALERT' && <CircleAlert className="h-5 w-5 text-amber-600"/>}
                                            {eligibility.overall === 'FAIL' && <X className="h-5 w-5 text-red-600"/>}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="text-sm space-y-1">
                                                <p>Passport: {eligibility.passport.status}</p>
                                                <p>Certs: {eligibility.certificates.status}</p>
                                                <p>Skills: {eligibility.skills.status}</p>
                                                <p>Cooldown: {eligibility.cooldown.status}</p>
                                                {[...eligibility.passport.details, ...eligibility.certificates.details, ...eligibility.skills.details, ...eligibility.cooldown.details].map((d,i) => <p key={i} className="text-destructive text-xs">{d}</p>)}
                                            </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : <Skeleton className="h-5 w-5"/>}
                                </TableCell>
                               </TableRow>
                           );
                        })}
                    </TableBody>
                    </Table>
                   </ScrollArea>
                </div>
              )}
               {selectedPositionId && <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Add any relevant notes for this batch of assignments..." {...field} /></FormControl><FormMessage /></FormItem>
              )}/> }
              
              {selectedPositionId && <div className="flex justify-end"><Button type="submit" disabled={loading || form.getValues('employeeIds').length === 0}>{loading ? 'Assigning...' : `Assign ${form.getValues('employeeIds')?.length || 0} Employees`}</Button></div>}

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


export default function NewAssignmentPage() {
    return (
        <Suspense fallback={<FullPageLoader />}>
            <NewAssignmentFormComponent />
        </Suspense>
    )
}
