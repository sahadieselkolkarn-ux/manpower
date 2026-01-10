

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, UserCheck } from "lucide-react";
import { collection, collectionGroup, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { type Client } from "@/types/client";
import { type ContractWithClient } from "@/types/contract";
import { type Project, type ProjectWithContract } from "@/types/project";
import { type Wave, WaveWithProject } from "@/types/wave";
import Link from "next/link";
import { useEffectOnce } from "react-use";
import { Badge } from "@/components/ui/badge";
import WaveForm from "@/components/forms/wave-form";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { canManageOperation } from "@/lib/authz";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


export default function WavesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWave, setSelectedWave] = useState<WaveWithProject | null>(null);
  const [waveToDelete, setWaveToDelete] = useState<WaveWithProject | null>(null);
  const [waves, setWaves] = useState<WaveWithProject[]>([]);
  const [projects, setProjects] = useState<ProjectWithContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const canManage = canManageOperation(userProfile);
  const canDelete = !!userProfile?.isAdmin;

  const fetchData = async () => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const clientSnapshot = await getDocs(collection(db, 'clients'));
      const clientList = clientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)).filter(c => !c.isDeleted);

      const contractSnapshot = await getDocs(collectionGroup(db, 'contracts'));
      const contractList = contractSnapshot.docs.map(doc => {
        const data = doc.data();
        const parentClient = clientList.find(c => doc.ref.parent.parent?.id === c.id);
        if (!parentClient) return null;
        return {
          id: doc.id,
          clientId: parentClient?.id || '',
          clientName: parentClient?.name || 'Unknown',
          ...data
        } as ContractWithClient;
      }).filter((c): c is ContractWithClient => c !== null && !c.isDeleted);

      const projectSnapshot = await getDocs(collectionGroup(db, 'projects'));
      const projectList = projectSnapshot.docs.map(doc => {
          const data = doc.data();
          const parentContractRef = doc.ref.parent.parent;
          const parentContract = contractList.find(c => c.id === parentContractRef?.id);
          if (!parentContract) return null;
          return {
              id: doc.id,
              ...data,
              contractId: parentContract?.id || '',
              contractName: parentContract?.name || 'Unknown',
              clientId: parentContract?.clientId || '',
              clientName: parentContract?.clientName || 'Unknown',
          } as ProjectWithContract;
      }).filter((p): p is ProjectWithContract => p !== null && !p.isDeleted);
      setProjects(projectList);

      const waveSnapshot = await getDocs(collectionGroup(db, 'waves'));
      const waveList = waveSnapshot.docs.map(doc => {
          const data = doc.data() as Wave;
          const projectRef = doc.ref.parent.parent;
          if (!projectRef) {
              console.warn(`Wave ${doc.id} is missing a parent project reference.`);
              return null;
          }
          const parentProject = projectList.find(p => p.id === projectRef?.id);
          if (!parentProject) {
               console.warn(`Could not find parent project for wave ${doc.id}`);
               return null;
          }
          return {
              id: doc.id,
              ...data,
              projectId: parentProject.id,
              projectName: parentProject.name,
              contractId: parentProject.contractId,
              clientId: parentProject.clientId,
              workMode: parentProject.workMode,
          } as WaveWithProject;
      }).filter((w): w is WaveWithProject => w !== null);

      setWaves(waveList);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffectOnce(() => {
    fetchData();
  });
  
  const handleAddWave = () => {
    setSelectedWave(null);
    setIsFormOpen(true);
  };

  const handleEditWave = (wave: WaveWithProject) => {
    setSelectedWave(wave);
    setIsFormOpen(true);
  };

  const handleDeleteWave = async () => {
    if (!waveToDelete || !userProfile || !db) return;

    const waveRef = doc(db, `clients/${waveToDelete.clientId}/contracts/${waveToDelete.contractId}/projects/${waveToDelete.projectId}/waves`, waveToDelete.id);
    try {
        await updateDoc(waveRef, {
            isDeleted: true,
            deletedAt: serverTimestamp(),
            deletedBy: userProfile.uid
        });
        toast({ title: 'Success', description: 'Wave has been deleted.' });
        fetchData();
    } catch (error) {
        console.error("Error deleting wave:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete wave.' });
    } finally {
        setWaveToDelete(null);
    }
  };


  const handleSuccess = () => {
    fetchData();
  }
  
  const visibleWaves = waves.filter(w => !w.isDeleted);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Waves
        </h1>
        {canManage && (
          <Button onClick={handleAddWave}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Wave
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Manage all work waves across all projects.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Wave List</CardTitle>
          <CardDescription>
            A list of all work waves in your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wave Code</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Work Mode</TableHead>
                <TableHead>Planned Period</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    {canManage && <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : visibleWaves.length > 0 ? (
                visibleWaves.map((wave) => (
                  <TableRow key={wave.id}>
                    <TableCell className="font-medium">
                       <Link href={`/dashboard/clients/${wave.clientId}/contracts/${wave.contractId}/projects/${wave.projectId}/waves/${wave.id}`} className="hover:underline text-primary" onClick={(e) => e.stopPropagation()}>
                        {wave.waveCode}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/clients/${wave.clientId}/contracts/${wave.contractId}/projects/${wave.projectId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {wave.projectName}
                      </Link>
                    </TableCell>
                    <TableCell>
                        <Badge variant={wave.workMode === "Onshore" ? "secondary" : "default"}>{wave.workMode}</Badge>
                    </TableCell>
                    <TableCell>
                        {formatDate(wave.planningWorkPeriod.startDate)} - {formatDate(wave.planningWorkPeriod.endDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{wave.status}</Badge>
                    </TableCell>
                    {canManage && (
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/hr/assignments/new?waveId=${wave.id}`)}}>
                          <UserCheck className="mr-2 h-4 w-4"/>
                          Assign
                       </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clients/${wave.clientId}/contracts/${wave.contractId}/projects/${wave.projectId}/waves/${wave.id}`)}}>
                                View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditWave(wave); }}>
                            Edit
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setWaveToDelete(wave); }}>
                                Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center">
                    No waves found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <WaveForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          wave={selectedWave}
          projects={projects.filter(p => !p.isDeleted)}
          onSuccess={handleSuccess}
        />
      )}

      {waveToDelete && (
         <AlertDialog open={!!waveToDelete} onOpenChange={() => setWaveToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this wave?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will archive the wave '{waveToDelete.waveCode}'. It can be restored later by an administrator. This will not delete its assignments.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteWave} className="bg-destructive hover:bg-destructive/90">
                        Delete Wave
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
