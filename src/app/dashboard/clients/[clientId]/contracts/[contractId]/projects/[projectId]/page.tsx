"use client";

import { use, useEffect, useState } from "react";
import {
  doc,
  DocumentReference,
  collection,
  getDocs,
  getDoc,
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
import { ArrowLeft, MoreHorizontal, PlusCircle } from "lucide-react";
import FullPageLoader from "@/components/full-page-loader";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { type Client } from "@/types/client";
import { type Contract } from "@/types/contract";
import { type Project } from "@/types/project";
import { type Wave } from "@/types/wave";
import WaveForm from "@/components/forms/wave-form";


export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ clientId: string, contractId: string, projectId: string }>;
}) {
  const resolvedParams = use(params);
  const { clientId, contractId, projectId } = resolvedParams;

  const [waves, setWaves] = useState<Wave[]>([]);
  const [isWaveFormOpen, setIsWaveFormOpen] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();

  const projectRef = useMemoFirebase(
    () =>
      db && clientId && contractId && projectId
        ? (doc(
            db,
            "clients",
            clientId,
            "contracts",
            contractId,
            "projects",
            projectId
          ) as DocumentReference<Project>)
        : null,
    [db, clientId, contractId, projectId]
  );

  const {
    data: project,
    isLoading: isLoadingProject,
    error: projectError,
  } = useDoc<Project>(projectRef);
  
  const [isDataLoading, setIsDataLoading] = useState(true);
  const isAdmin = userProfile?.role === "admin";

  const fetchData = async () => {
    if (!db || !clientId || !contractId || !projectId) return;
    setIsDataLoading(true);

    // Fetch Client
    const clientRef = doc(db, "clients", clientId);
    const clientSnap = await getDoc(clientRef);
    if(clientSnap.exists()) {
        setClient({ id: clientSnap.id, ...clientSnap.data() } as Client);
    }
    
    // Fetch Contract
    const contractRef = doc(db, "clients", clientId, 'contracts', contractId);
    const contractSnap = await getDoc(contractRef);
    if(contractSnap.exists()) {
        setContract({ id: contractSnap.id, ...contractSnap.data() } as Contract);
    }

    // Fetch Waves
    const wavesRef = collection(
      db,
      "clients",
      clientId,
      "contracts",
      contractId,
      "projects",
      projectId,
      "waves"
    );
    const wavesSnap = await getDocs(wavesRef);
    const wavesList = wavesSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Wave)
    );
    setWaves(wavesList);
    setIsDataLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [clientId, contractId, projectId, db]);

  const handleSuccess = () => {
    fetchData();
  };

  if (isLoadingProject || authLoading) {
    return <FullPageLoader />;
  }

  const error = projectError;
  if (error) {
    return (
      <div className="p-8 text-destructive">
        Error loading project: {error.message}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <h1 className="text-2xl font-bold">Project Not Found</h1>
        <p>
          The project could not be found.
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
      <header>
          <Link href={`/dashboard/clients/${clientId}/contracts/${contractId}`} className="text-sm text-muted-foreground hover:underline flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to {contract?.name || 'Contract'}
          </Link>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Project: {project.name}
          </h1>
          <p className="text-muted-foreground">
            Manage waves and assignments for this project.
          </p>
      </header>
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Client</CardDescription>
            <CardTitle className="text-lg">{client?.name}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contract</CardDescription>
            <CardTitle className="text-lg">{contract?.name}</CardTitle>
          </CardHeader>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Work Mode</CardDescription>
            <CardTitle className="text-lg"> <Badge variant={project.workMode === "Onshore" ? "secondary" : "default"}>{project.workMode}</Badge></CardTitle>
          </CardHeader>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Waves</CardDescription>
            <CardTitle className="text-lg">{waves.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

       {/* Waves Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Waves</CardTitle>
            <CardDescription>
              List of all work waves for this project.
            </CardDescription>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsWaveFormOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Wave
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wave Code</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDataLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading waves...</TableCell>
                </TableRow>
              ) : waves.length > 0 ? (
                waves.map((wave) => (
                  <TableRow key={wave.id}>
                    <TableCell className="font-medium">
                       <Link href={`/dashboard/clients/${clientId}/contracts/${contractId}/projects/${projectId}/waves/${wave.id}`} className="hover:underline text-primary">
                        {wave.waveCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {wave.planningWorkPeriod.startDate?.toDate().toLocaleDateString()}
                    </TableCell>
                     <TableCell>
                      {wave.planningWorkPeriod.endDate?.toDate().toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
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
                    No waves found for this project.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       {isAdmin && (
        <WaveForm
          open={isWaveFormOpen}
          onOpenChange={setIsWaveFormOpen}
          onSuccess={handleSuccess}
          routeParams={{clientId, contractId, projectId}}
        />
      )}
      
    </div>
  );
}
