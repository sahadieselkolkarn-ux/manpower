
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, doc, getDoc, serverTimestamp, query, where, orderBy, limit, getDocs, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { type Wave } from '@/types/wave';
import { type Employee, WorkHistoryItem } from '@/types/employee';
import { type ManpowerPosition } from '@/types/position';
import { type CooldownPolicy } from '@/types/cooldown-policy';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, Check, CircleAlert, X, FileText, BadgeCheck, Tag } from 'lucide-react';
import { toDate } from '@/lib/utils';
import { EligibilityStatus, Assignment } from '@/types/assignment';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Contract, ContractSaleRate } from '@/types/contract';
import { Timestamp } from 'firebase/firestore';


const formSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee.'),
  positionId: z.string().min(1, 'Please select a position for this assignment.'),
  overrideReason: z.string().optional(),
});

interface EligibilityResult {
  passportStatus: EligibilityStatus;
  certificateStatus: EligibilityStatus;
  cooldownStatus: EligibilityStatus;
  overall: EligibilityStatus;
  details: string[];
  requiredRestDays?: number;
  actualRestDays?: number;
  policyVersion?: string;
  workModePair?: string;
}

// Pure functions for eligibility checks
const checkPassport = (employee: Employee): { status: EligibilityStatus, details: string[] } => {
    if (!employee.documents) return { status: 'PASS', details: [] };
    const passport = employee.documents.find(d => d.type === 'Passport');
    if (!passport || !passport.expiryDate) return { status: 'PASS', details: [] };
    
    const expiry = toDate(passport.expiryDate);
    if (!expiry) return { status: 'PASS', details: [] };

    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    if (expiry < today) return { status: 'FAIL', details: [`Passport expired on ${expiry.toLocaleDateString()}`] };
    if (expiry < sixMonthsFromNow) return { status: 'ALERT', details: [`Passport expires soon on ${expiry.toLocaleDateString()}`] };
    
    return { status: 'PASS', details: [] };
};

const checkCertificates = (employee: Employee): { status: EligibilityStatus, details: string[] } => {
    if (!employee.documents) return { status: 'PASS', details: [] };
    const certs = employee.documents.filter(d => d.type === 'Certificate');
    if (certs.length === 0) return { status: 'PASS', details: [] };

    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    let finalStatus: EligibilityStatus = 'PASS';
    const details: string[] = [];

    certs.forEach(cert => {
        const expiry = toDate(cert.expiryDate);
        if (expiry) {
            if (expiry < today) {
                finalStatus = 'FAIL';
                details.push(`Certificate '${cert.name}' expired on ${expiry.toLocaleDateString()}`);
            } else if (expiry < sixMonthsFromNow && finalStatus !== 'FAIL') {
                finalStatus = 'ALERT';
                details.push(`Certificate '${cert.name}' expires soon on ${expiry.toLocaleDateString()}`);
            }
        }
    });

    return { status: finalStatus, details };
};

const checkCooldown = async (db: any, employee: Employee, newWave: Wave): Promise<{ status: EligibilityStatus, details: string[], required?: number, actual?: number, version?: string, pair?: string }> => {
    
    if (!employee.workHistory || employee.workHistory.length === 0) {
        return { status: 'PASS', details: ['No previous work history found.'] };
    }
    
    // Sort history by end date to find the last assignment
    const sortedHistory = [...employee.workHistory].sort((a, b) => {
        const dateA = a.actualEndDate ? toDate(a.actualEndDate)!.getTime() : 0;
        const dateB = b.actualEndDate ? toDate(b.actualEndDate)!.getTime() : 0;
        return dateB - dateA;
    });

    const lastWork = sortedHistory[0] as WorkHistoryItem;
    const lastEndDate = toDate(lastWork.actualEndDate);
    const newStartDate = toDate(newWave.planningWorkPeriod.startDate);
    // @ts-ignore
    const newWorkMode = newWave.workMode;

    if (!lastEndDate || !newStartDate || !lastWork.workMode || !newWorkMode) {
        return { status: 'ALERT', details: ['Cannot determine cooldown without complete start/end dates or work modes.'] };
    }
    
    const restDays = (newStartDate.getTime() - lastEndDate.getTime()) / (1000 * 3600 * 24);

    const policyQuery = query(
        collection(db, 'cooldownPolicies'),
        where('effectiveFrom', '<=', newStartDate),
        orderBy('effectiveFrom', 'desc'),
        limit(1)
    );
    const policySnap = await getDocs(policyQuery);
    if (policySnap.empty) return { status: 'FAIL', details: ['No active cooldown policy found for the assignment period.'] };
    
    const policy = policySnap.docs[0].data() as CooldownPolicy;
    // @ts-ignore
    const workModePair = `${lastWork.workMode.toLowerCase()}_to_${newWorkMode.toLowerCase()}` as keyof CooldownPolicy['matrix'];
    const requiredRestDays = policy.matrix[workModePair] ?? 0;
    
    if (restDays >= requiredRestDays) {
        return { status: 'PASS', details: [], required: requiredRestDays, actual: Math.floor(restDays), version: policy.policyVersion, pair: workModePair };
    } else {
        return { 
            status: 'FAIL', 
            details: [`Cooldown requirement not met. Required: ${requiredRestDays} days, Actual: ${Math.floor(restDays)} days.`],
            required: requiredRestDays, 
            actual: Math.floor(restDays),
            version: policy.policyVersion,
            pair: workModePair,
        };
    }
}


interface AssignmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wave: Wave;
  routeParams: {
    clientId: string;
    contractId: string;
    projectId: string;
    waveId: string;
  };
  onSuccess?: () => void;
}

export default function AssignmentForm({
  open,
  onOpenChange,
  wave,
  routeParams,
  onSuccess,
}: AssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);

  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const employeesQuery = useMemoFirebase(() => db ? query(collection(db, 'employees'), where('employeeType', '==', 'FIELD')) : null, [db]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const positionsQuery = useMemoFirebase(() => db ? collection(db, 'manpowerPositions') : null, [db]);
  const { data: positions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(positionsQuery);

  useEffect(() => {
    if (db && routeParams) {
        const contractRef = doc(db, 'clients', routeParams.clientId, 'contracts', routeParams.contractId);
        getDoc(contractRef).then(snap => {
            if (snap.exists()) {
                setContract({id: snap.id, ...snap.data()} as Contract);
            }
        });
    }
  }, [db, routeParams]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { employeeId: '', positionId: '', overrideReason: '' },
  });

  const selectedEmployeeId = form.watch('employeeId');

  const requiredPositionIds = useMemo(() => {
    if (!wave.manpowerRequirement || !Array.isArray(wave.manpowerRequirement)) return [];
    return wave.manpowerRequirement.map(req => req.positionId);
  }, [wave.manpowerRequirement]);

  // Filter employees who are "Active" and have at least one position required by the wave
  const availableEmployees = useMemo(() => {
    if (!employees || !requiredPositionIds) return [];
    return employees.filter(e => 
        e.employmentStatus === 'Active' &&
        e.positionIds.some(posId => requiredPositionIds.includes(posId))
    );
  }, [employees, requiredPositionIds]);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId || !employees) return null;
    return employees.find(e => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, employees]);

  // Filter positions based on wave requirements AND selected employee's skills
  const availablePositionsForEmployee = useMemo(() => {
    if (!selectedEmployee || !positions || !requiredPositionIds) return [];
    
    // Filter positions that are both required by the wave AND present in the employee's positionIds
    return positions.filter(p => 
      requiredPositionIds.includes(p.id) && 
      selectedEmployee.positionIds.includes(p.id)
    );
  }, [selectedEmployee, positions, requiredPositionIds]);


  useEffect(() => {
    if (!open) {
      form.reset();
      setEligibility(null);
    }
  }, [open, form]);

  useEffect(() => {
    const runChecks = async () => {
        if (!db || !selectedEmployee) {
            setEligibility(null);
            return;
        }

        const passportResult = checkPassport(selectedEmployee);
        const certResult = checkCertificates(selectedEmployee);
        const cooldownResult = await checkCooldown(db, selectedEmployee, wave);

        let overall: EligibilityStatus = 'PASS';
        if (passportResult.status === 'FAIL' || certResult.status === 'FAIL' || cooldownResult.status === 'FAIL') {
            overall = 'FAIL';
        } else if (passportResult.status === 'ALERT' || certResult.status === 'ALERT') {
            overall = 'ALERT';
        }

        setEligibility({
            passportStatus: passportResult.status,
            certificateStatus: certResult.status,
            cooldownStatus: cooldownResult.status,
            overall: overall,
            details: [...passportResult.details, ...certResult.details, ...cooldownResult.details],
            requiredRestDays: cooldownResult.required,
            actualRestDays: cooldownResult.actual,
            policyVersion: cooldownResult.version,
            workModePair: cooldownResult.pair,
        });
    }
    runChecks();
  }, [selectedEmployee, wave, db]);

  // Auto-select position if there's only one valid option
  useEffect(() => {
    if (availablePositionsForEmployee.length === 1) {
        form.setValue('positionId', availablePositionsForEmployee[0].id);
    } else {
        form.setValue('positionId', '');
    }
  }, [availablePositionsForEmployee, form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userProfile || !db || !eligibility || !contract) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot process assignment. System not ready.' });
      return;
    }
    
    const isOverride = !!values.overrideReason;
    if (eligibility.overall === 'FAIL' && !isOverride) {
        toast({ variant: 'destructive', title: 'Assignment Blocked', description: 'Cannot assign employee due to eligibility failure. An override reason is required.'});
        return;
    }

    const workMode = String((wave as any).workMode || '').trim().toLowerCase();
    const saleRateInfo = contract.saleRates?.find(r => r.positionId === values.positionId);

    const getSellRate = (rateInfo: ContractSaleRate | undefined) => {
        if (!rateInfo) return 0;
        const legacyRate = Number(rateInfo.dailyRateExVat ?? 0);
        if (workMode === 'onshore') {
            return Number(rateInfo.onshoreSellDailyRateExVat ?? legacyRate);
        }
        if (workMode === 'offshore') {
            return Number(rateInfo.offshoreSellDailyRateExVat ?? legacyRate);
        }
        return legacyRate; // Fallback if workMode is somehow invalid
    };

    const sellRate = getSellRate(saleRateInfo);

    if (!saleRateInfo) {
      toast({ variant: 'destructive', title: 'Assignment Blocked', description: 'ตำแหน่งนี้ยังไม่ได้กำหนดราคาในสัญญา' });
      return;
    }
    
    if (!Number.isFinite(sellRate) || sellRate <= 0) {
        toast({ variant: 'destructive', title: 'Assignment Blocked', description: 'ราคาขายของตำแหน่งนี้สำหรับโหมดงาน (Onshore/Offshore) เป็น 0 กรุณาแก้ที่สัญญา' });
        return;
    }

    setLoading(true);

    try {
      const selectedEmployee = employees?.find(e => e.id === values.employeeId);
      const selectedPosition = positions?.find(p => p.id === values.positionId);
      
      const assignmentId = `${wave.id}_${values.employeeId}`;
      const assignmentRef = doc(db, 'assignments', assignmentId);

      const assignmentData: Omit<Assignment, 'id'> = {
        employeeId: values.employeeId,
        employeeName: `${selectedEmployee?.personalInfo.firstName} ${selectedEmployee?.personalInfo.lastName}`,
        employeeCode: selectedEmployee?.employeeCode || 'N/A',
        employeeType: 'FIELD',
        positionId: values.positionId,
        positionName: selectedPosition?.name || 'N/A',
        waveId: routeParams.waveId,
        projectId: routeParams.projectId,
        clientId: routeParams.clientId,
        contractId: routeParams.contractId,
        // @ts-ignore
        workMode: wave.workMode,
        status: 'ACTIVE',
        startDate: toDate(wave.planningWorkPeriod.startDate)!.toISOString().split('T')[0],
        endDate: toDate(wave.planningWorkPeriod.endDate)!.toISOString().split('T')[0],
        assignedAt: serverTimestamp() as Timestamp,
        assignedBy: userProfile.displayName || userProfile.email,
        eligibility: {
          passportStatus: eligibility.passportStatus,
          certificateStatus: eligibility.certificateStatus,
          cooldownStatus: eligibility.cooldownStatus,
          overall: eligibility.overall,
          details: eligibility.details,
        },
        override: {
            overrideFlag: isOverride,
            overrideReason: values.overrideReason || undefined,
            overrideBy: isOverride ? userProfile.displayName : undefined,
            overrideAt: isOverride ? serverTimestamp() as Timestamp : undefined,
        },
        policyVersion: eligibility.policyVersion,
        workModePair: eligibility.workModePair,
        appliedRestDays: eligibility.requiredRestDays,
        sellRateAtSnapshot: sellRate,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      await setDoc(assignmentRef, assignmentData, { merge: true });

      toast({ title: 'Success', description: 'Employee assigned successfully.' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'There was a problem assigning the employee.',
      });
    } finally {
      setLoading(false);
    }
  };

  const showOverride = eligibility?.overall === 'FAIL';
  const passportDoc = selectedEmployee?.documents?.find(d => d.type === 'Passport');
  const certificateDocs = selectedEmployee?.documents?.filter(d => d.type === 'Certificate') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Assign Employee to Wave</DialogTitle>
          <DialogDescription>
            Select an available employee and the position they will fill in this wave.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee (ลูกจ้าง)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an available employee..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingEmployees ? (
                        <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                      ) : (
                        availableEmployees?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.personalInfo.firstName} {emp.personalInfo.lastName} ({emp.employeeCode})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedEmployee && (
              <Card className="bg-muted/50">
                <CardHeader><CardTitle className="text-base">Employee Details</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Documents</h4>
                      <Separator className="my-2"/>
                      {passportDoc ? (
                          <p>Passport Exp: {toDate(passportDoc.expiryDate)?.toLocaleDateString() || 'N/A'}</p>
                      ): <p>No passport on file.</p>}
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        {certificateDocs.length > 0 ? certificateDocs.map((cert, i) => (
                           <li key={i}>{cert.name} (Exp: {toDate(cert.expiryDate)?.toLocaleDateString() || 'N/A'})</li>
                        )) : <li>No certificates on file.</li>}
                      </ul>
                    </div>
                     <div>
                       <h4 className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4" />Skills</h4>
                       <Separator className="my-2"/>
                        {selectedEmployee.skillTags && selectedEmployee.skillTags.length > 0 ? (
                           <div className="flex flex-wrap gap-1">
                            {selectedEmployee.skillTags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                          </div>
                        ): <p>No skills listed.</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

             <FormField
              control={form.control}
              name="positionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position (ลูกจ้าง)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedEmployeeId || isLoadingPositions || availablePositionsForEmployee.length <= 1}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedEmployeeId ? "Select an employee first" : "Select a required position..."} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePositionsForEmployee.length > 0 ? (
                        availablePositionsForEmployee.map(pos => (
                          <SelectItem key={pos.id} value={pos.id}>
                            {pos.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          {selectedEmployeeId ? 'No matching positions for this employee in this wave' : 'Select an employee first'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {eligibility && (
                <Card>
                    <CardHeader><CardTitle>Eligibility Check</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between items-center"><span>Overall Status</span><span className={`font-bold ${eligibility.overall === 'FAIL' ? 'text-red-500' : eligibility.overall === 'ALERT' ? 'text-amber-500' : 'text-green-500'}`}>{eligibility.overall}</span></div>
                        <div className="flex justify-between items-center"><span>Passport</span><span>{eligibility.passportStatus}</span></div>
                        <div className="flex justify-between items-center"><span>Certificates</span><span>{eligibility.certificateStatus}</span></div>
                        <div className="flex justify-between items-center"><span>Cooldown</span><span>{eligibility.cooldownStatus}</span></div>
                        {eligibility.details.length > 0 && (
                            <Alert variant={eligibility.overall === 'FAIL' ? 'destructive' : 'default'} className={eligibility.overall === 'ALERT' ? 'bg-amber-50 border-amber-200 text-amber-800' : ''}>
                                <CircleAlert className="h-4 w-4" />
                                <AlertTitle>Details</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc pl-4">
                                        {eligibility.details.map((d, i) => <li key={i}>{d}</li>)}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}

            {showOverride && (
                 <FormField
                    control={form.control}
                    name="overrideReason"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-destructive">Override Reason</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Explain why this assignment must proceed despite the eligibility failure." {...field} />
                            </FormControl>
                            <FormDescription>This action will be recorded in the audit log.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={loading || isLoadingEmployees || isLoadingPositions || !eligibility}>
                {loading ? 'Assigning...' : 'Assign Employee'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
