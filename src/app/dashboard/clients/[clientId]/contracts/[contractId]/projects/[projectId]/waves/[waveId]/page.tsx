
"use client";

import { use, useMemo, useState, useEffect } from "react";
import {
  doc,
  DocumentReference,
  collection,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, MoreHorizontal, PlusCircle, Users, Award, Tag, Pencil, Copy, Download, FilePlus } from "lucide-react";
import FullPageLoader from "@/components/full-page-loader";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { type Wave } from "@/types/wave";
import { type Assignment } from "@/types/assignment";
import { type Project } from "@/types/project";
import AssignmentForm from "@/components/forms/assignment-form";
import { Skeleton } from "@/components/ui/skeleton";
import { type ManpowerPosition } from "@/types/position";
import { CertificateType } from "@/types/certificate-type";
import WaveForm from "@/components/forms/wave-form";
import { useToast } from "@/hooks/use-toast";
import { canManageOperation } from "@/lib/authz";
import { useRouter } from "next/navigation";


export default function WaveDetailsPage({ params }: { params: Promise<{ clientId: string, contractId: string, projectId: string, waveId: string }> }) {
  const resolvedParams = use(params);
  const { clientId, contractId, projectId, waveId } = resolvedParams;

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);
  const [isWaveFormOpen, setIsWaveFormOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  const canManage = canManageOperation(userProfile);

  const waveRef = useMemoFirebase(
    () =>
      db && waveId
        ? (doc(
            db,
            "clients",
            clientId,
            "contracts",
            contractId,
            "projects",
            projectId,
            "waves",
            waveId
          ) as DocumentReference<Wave>)
        : null,
    [db, clientId, contractId, projectId, waveId]
  );
  
  const assignmentsQuery = useMemoFirebase(
      () => db ? query(collection(db, 'assignments'), where('waveId', '==', waveId)) : null,
      [db, waveId]
  );
  
  const positionsQuery = useMemoFirebase(() => (db ? collection(db, 'manpowerPositions') : null), [db]);
  const certificateTypesQuery = useMemoFirebase(() => (db ? collection(db, 'certificateTypes') : null), [db]);


  const { data: wave, isLoading: isLoadingWave, error: waveError, refetch: refetchWave } = useDoc<Wave>(waveRef);
  const { data: assignments, isLoading: isLoadingAssignments, error: assignmentsError, refetch: refetchAssignments } = useCollection<Assignment>(assignmentsQuery);
  const { data: positions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(positionsQuery);
  const { data: certificateTypes, isLoading: isLoadingCertificateTypes } = useCollection<CertificateType>(certificateTypesQuery);

  const positionMap = useMemo(() => new Map(positions?.map(p => [p.id, p.name])), [positions]);
  const certificateTypeMap = useMemo(() => new Map(certificateTypes?.map(ct => [ct.id, ct.name])), [certificateTypes]);


  useEffect(() => {
    if (db && projectId) {
      const projectRef = doc(db, "clients", clientId, "contracts", contractId, "projects", projectId);
      getDoc(projectRef).then(snap => {
        if (snap.exists()) {
          setProject({id: snap.id, ...snap.data()} as Project);
        }
      });
    }
  }, [db, clientId, contractId, projectId]);

  const handleSuccess = () => {
    refetchWave();
    refetchAssignments();
  }
  
  const copyEmployeeNames = () => {
    if (!assignments || assignments.length === 0) return;
    const names = assignments.map(a => a.employeeName).join('\n');
    navigator.clipboard.writeText(names);
    toast({
      title: "Copied!",
      description: "Employee names have been copied to your clipboard.",
    });
  };

  const handleCreateTimesheet = () => {
    if (!wave) return;
    const intakeParams = new URLSearchParams({
      clientId: clientId,
      contractId: contractId,
      projectId: projectId,
      waveId: waveId,
    });
    router.push(`/dashboard/hr/timesheets/intake?${intakeParams.toString()}`);
  }


  const isLoading = isLoadingWave || isLoadingAssignments || authLoading || !project || isLoadingPositions || isLoadingCertificateTypes;

  if (isLoading) {
    return <FullPageLoader />;
  }
  
  const error = waveError || assignmentsError;
  if (error) {
      return <div className="p-8 text-destructive">Error loading data: {error.message}</div>
  }
  
  if (!wave) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <h1 className="text-2xl font-bold">Wave Not Found</h1>
        <p>The wave with ID <span className="font-mono bg-muted p-1 rounded">{waveId}</span> could not be found.</p>
        <Button onClick={() => window.history.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }
  
  const totalRequired = Array.isArray(wave.manpowerRequirement) ? wave.manpowerRequirement.reduce((sum, req) => sum + req.count, 0) : 0;
  const activeAssignments = assignments?.filter(a => a.status === 'ACTIVE') || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <header className="flex items-center justify-between space-y-2">
        <div>
           <Link href={`/dashboard/clients/${clientId}/contracts/${contractId}/projects/${projectId}`} className="text-sm text-muted-foreground hover:underline flex items-center gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Project: {project?.name || '...'}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Wave: {wave.waveCode}</h1>
          <p className="text-muted-foreground">
            จัดการข้อมูลคนลงงานและเอกสารสำหรับรอบงานนี้
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
            {canManage && (
              <Button onClick={handleCreateTimesheet} className="bg-blue-600 hover:bg-blue-700">
                <FilePlus className="mr-2 h-4 w-4" /> Create Timesheet Batch
              </Button>
            )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planned Period</CardDescription>
            <CardTitle className="text-lg">{wave.planningWorkPeriod.startDate.toDate().toLocaleDateString()} - {wave.planningWorkPeriod.endDate.toDate().toLocaleDateString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
           <CardHeader className="pb-2">
            <CardDescription>Actual Period</CardDescription>
            <CardTitle className="text-lg text-muted-foreground italic">
              Not Started
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Manpower Assigned (Active)</CardDescription>
             <CardTitle className="text-lg">{activeAssignments.length} / {totalRequired}</CardTitle>
          </CardHeader>
        </Card>
      </div>

    <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>ตำแหน่งที่ต้องการ (Manpower Requirements)</CardTitle>
                  <CardDescription>ตำแหน่งและจำนวนคนที่ต้องการสำหรับ Wave นี้</CardDescription>
                </div>
                 {canManage && (
                  <Button variant="outline" size="sm" onClick={() => setIsWaveFormOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> แก้ไข
                  </Button>
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Position</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Required</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingPositions || isLoadingCertificateTypes ? (
                             <TableRow><TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                        ) : wave.manpowerRequirement && wave.manpowerRequirement.length > 0 ? (
                            wave.manpowerRequirement.map((req, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{positionMap.get(req.positionId) || req.positionId}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {req.requiredCertificateIds && req.requiredCertificateIds.map(certId => (
                                                <Badge variant="outline" key={certId} className="flex gap-1 items-center w-fit"><Award className="h-3 w-3"/> {certificateTypeMap.get(certId) || 'Unknown Cert'}</Badge>
                                            ))}
                                            {req.requiredSkillTags && req.requiredSkillTags.map(skill => (
                                                 <Badge variant="secondary" key={skill} className="flex gap-1 items-center w-fit"><Tag className="h-3 w-3"/>{skill}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{req.count}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">No requirements specified.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>รายชื่อที่ลงแล้ว (Assignments)</CardTitle>
                        <CardDescription>พนักงานทั้งหมดที่ถูกเลือกสำหรับ Wave นี้</CardDescription>
                    </div>
                     {canManage && (
                      <Button onClick={() => router.push(`/dashboard/hr/assignments/new?waveId=${waveId}`)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Assignment
                      </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee Name</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Status</TableHead>
                                {canManage && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingAssignments ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                        {canManage && <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>}
                                    </TableRow>
                                ))
                            ) : assignments && assignments.length > 0 ? (
                                assignments.map(assignment => (
                                    <TableRow key={assignment.id}>
                                        <TableCell className="font-medium">{assignment.employeeName || 'N/A'}</TableCell>
                                        <TableCell>{positionMap.get(assignment.positionId) || 'N/A'}</TableCell>
                                        <TableCell><Badge variant={assignment.status === 'ACTIVE' ? 'default' : 'secondary'}>{assignment.status}</Badge></TableCell>
                                        {canManage && <TableCell className="text-right"><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></TableCell>}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 4 : 3} className="h-24 text-center">
                                        ยังไม่มีพนักงานใน Wave นี้
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Timesheet Employee List</CardTitle>
                    <CardDescription>A list of assigned employees for client timesheet creation.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyEmployeeNames} disabled={!assignments || assignments.length === 0}>
                    <Copy className="mr-2 h-4 w-4" /> Copy List
                  </Button>
                </CardHeader>
                <CardContent>
                  {assignments && assignments.length > 0 ? (
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {assignments.map(a => (
                        <li key={a.id}>{a.employeeName}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">No employees assigned yet.</p>
                  )}
                </CardContent>
              </Card>
        </div>
      </div>

      {canManage && wave && project && (
        <>
            <AssignmentForm
            open={isAssignmentFormOpen}
            onOpenChange={setIsAssignmentFormOpen}
            wave={{...wave, id: waveId, workMode: project.workMode}}
            routeParams={{ clientId, contractId, projectId, waveId }}
            onSuccess={handleSuccess}
            />
            <WaveForm
                open={isWaveFormOpen}
                onOpenChange={setIsWaveFormOpen}
                wave={{...wave, id: waveId, clientId, contractId, projectId, projectName: project.name, workMode: project.workMode }}
                onSuccess={handleSuccess}
                projects={project ? [{...project, clientId, clientName: '' ,contractId, contractName: ''}] : []}
            />
        </>
      )}
    </div>
  );
}

    