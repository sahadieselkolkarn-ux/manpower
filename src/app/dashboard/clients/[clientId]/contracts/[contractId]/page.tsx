"use client";

import { use, useEffect, useState } from "react";
import {
  doc,
  DocumentReference,
  collection,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
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
import { ArrowLeft, MoreHorizontal, PlusCircle, Lock, Unlock, CalendarDays, Percent, DollarSign } from "lucide-react";
import FullPageLoader from "@/components/full-page-loader";
import Link from "next/link";
import { type Client } from "@/types/client";
import { type Contract } from "@/types/contract";
import { type Project } from "@/types/project";
import ProjectForm from "@/components/forms/project-form";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useCollection } from "@/firebase";
import { ManpowerPosition } from "@/types/position";
import { canManageOperation } from "@/lib/authz";

export default function ContractDetailsPage({
  params,
}: {
  params: Promise<{ clientId: string; contractId: string }>;
}) {
  const resolvedParams = use(params);
  const { clientId, contractId } = resolvedParams;

  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [client, setClient] = useState<Client | null>(null);

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const contractRef = useMemoFirebase(
    () =>
      db && clientId && contractId
        ? (doc(
            db,
            "clients",
            clientId,
            "contracts",
            contractId
          ) as DocumentReference<Contract>)
        : null,
    [db, clientId, contractId]
  );

  const {
    data: contract,
    isLoading: isLoadingContract,
    error: contractError,
    refetch: refetchContract,
  } = useDoc<Contract>(contractRef);

  const manpowerPositionsQuery = useMemoFirebase(() => (db ? collection(db, 'manpowerPositions') : null), [db]);
  const { data: positions, isLoading: isLoadingPositions } = useCollection<ManpowerPosition>(manpowerPositionsQuery);
  const positionMap = new Map(positions?.map(p => [p.id, p.name]));
  
  const [isDataLoading, setIsDataLoading] = useState(true);
  const canManage = canManageOperation(userProfile);

  const fetchData = async () => {
    if (!db || !clientId || !contractId) return;
    setIsDataLoading(true);

    const clientRef = doc(db, "clients", clientId);
    const clientSnap = await getDoc(clientRef);
    if(clientSnap.exists()) {
        setClient({ id: clientSnap.id, ...clientSnap.data() } as Client);
    }

    const projectsRef = collection(
      db,
      "clients",
      clientId,
      "contracts",
      contractId,
      "projects"
    );
    const projectsSnap = await getDocs(projectsRef);
    const projectsList = projectsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Project)
    );
    setProjects(projectsList);
    setIsDataLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [clientId, contractId, db]);

  const handleLockContract = async () => {
    if (!contractRef || !canManage) return;

    try {
        await updateDoc(contractRef, {
            isLocked: true,
            lockedAt: serverTimestamp(),
        });
        toast({
            title: "Contract Locked",
            description: "The contract terms are now read-only."
        });
        refetchContract();
    } catch(error) {
        console.error("Error locking contract:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to lock the contract."
        });
    }
  }

  const handleSuccess = () => {
    fetchData();
    refetchContract();
  };

  if (isLoadingContract || authLoading || isLoadingPositions) {
    return <FullPageLoader />;
  }

  const error = contractError;
  if (error) {
    return (
      <div className="p-8 text-destructive">
        Error loading contract: {error.message}
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <h1 className="text-2xl font-bold">Contract Not Found</h1>
        <p>
          The contract could not be found.
        </p>
        <Button
          onClick={() => window.history.back()}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <header className="flex justify-between items-start">
        <div>
            <Link href={`/dashboard/clients/${clientId}`} className="text-sm text-muted-foreground hover:underline flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to {client?.name || 'Client'}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                {contract.isLocked ? <Lock className="h-6 w-6 text-muted-foreground" /> : <Unlock className="h-6 w-6 text-muted-foreground" />}
                Contract: {contract.name}
            </h1>
            <p className="text-muted-foreground">
                Manage projects and terms for this contract. 
                {contract.isLocked && <Badge variant="secondary" className="ml-2">Locked</Badge>}
            </p>
        </div>
        {canManage && !contract.isLocked && (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive"><Lock className="mr-2 h-4 w-4" />Lock Contract</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to lock this contract?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. Locking the contract will make its pricing and terms read-only.
                        This is a critical step before creating assignments.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLockContract}>Yes, Lock Contract</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      </header>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Sale Rates</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Position</TableHead>
                            <TableHead className="text-right">Daily Rate (ex. VAT)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contract.saleRates?.map(rate => (
                            <TableRow key={rate.positionId}>
                                <TableCell>{positionMap.get(rate.positionId) || 'Unknown Position'}</TableCell>
                                <TableCell className="text-right font-mono">{rate.dailyRateExVat.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" />OT Rules</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-sm text-muted-foreground">Workday</p><p className="text-2xl font-bold">{contract.otRules?.workdayMultiplier}x</p></div>
                    <div><p className="text-sm text-muted-foreground">Weekly Holiday</p><p className="text-2xl font-bold">{contract.otRules?.weeklyHolidayMultiplier}x</p></div>
                    <div><p className="text-sm text-muted-foreground">Contract Holiday</p><p className="text-2xl font-bold">{contract.otRules?.contractHolidayMultiplier}x</p></div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Holiday Calendar</CardTitle></CardHeader>
                <CardContent>
                    {contract.holidayCalendar?.dates && contract.holidayCalendar.dates.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {contract.holidayCalendar.dates.map(date => <Badge key={date} variant="outline">{date}</Badge>)}
                        </div>
                    ) : <p className="text-sm text-muted-foreground">No custom holidays defined.</p>}
                </CardContent>
            </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              List of all projects under this contract.
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={() => setIsProjectFormOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Project
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDataLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading projects...</TableCell>
                </TableRow>
              ) : projects.length > 0 ? (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                       <Link href={`/dashboard/clients/${clientId}/contracts/${contractId}/projects/${project.id}`} className="hover:underline text-primary">
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {project.createdAt?.toDate().toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{project.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No projects found for this contract.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       {canManage && client && contract && (
        <ProjectForm
          open={isProjectFormOpen}
          onOpenChange={setIsProjectFormOpen}
          contracts={[{...contract, id: contractId, clientId: clientId, clientName: client.name}]}
          onSuccess={handleSuccess}
        />
      )}
      
    </div>
  );
}
