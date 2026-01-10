
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { collection, collectionGroup, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { type Client } from "@/types/client";
import { type ContractWithClient } from "@/types/contract";
import { type ProjectWithContract } from "@/types/project";
import ProjectForm from "@/components/forms/project-form";
import Link from "next/link";
import { useEffectOnce } from "react-use";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { canManageOperation } from "@/lib/authz";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";


export default function ProjectPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithContract | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithContract | null>(null);
  const [projects, setProjects] = useState<ProjectWithContract[]>([]);
  const [contracts, setContracts] = useState<ContractWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const canManage = canManageOperation(userProfile);

  const fetchData = async () => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch all clients to map names
      const clientSnapshot = await getDocs(collection(db, 'clients'));
      const clientList = clientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));

      // Fetch all contracts to map names
      const contractSnapshot = await getDocs(collectionGroup(db, 'contracts'));
      const contractList = contractSnapshot.docs.map(doc => {
        const data = doc.data();
        const parentClient = clientList.find(c => doc.ref.parent.parent?.id === c.id);
        return {
          id: doc.id,
          clientId: parentClient?.id || '',
          clientName: parentClient?.name || 'Unknown',
          ...data
        } as ContractWithClient;
      });
      setContracts(contractList);

      // Fetch all projects
      const projectSnapshot = await getDocs(collectionGroup(db, 'projects'));
      const projectList = projectSnapshot.docs.map(doc => {
          const data = doc.data();
          const parentContractRef = doc.ref.parent.parent;
          const parentContract = contractList.find(c => c.id === parentContractRef?.id);
          return {
              id: doc.id,
              ...data,
              contractId: parentContract?.id || '',
              contractName: parentContract?.name || 'Unknown',
              clientId: parentContract?.clientId || '',
              clientName: parentContract?.clientName || 'Unknown',
          } as ProjectWithContract;
      });

      setProjects(projectList);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffectOnce(() => {
    fetchData();
  });
  
  const handleAddProject = () => {
    setSelectedProject(null);
    setIsFormOpen(true);
  };

  const handleEditProject = (project: ProjectWithContract) => {
    setSelectedProject(project);
    setIsFormOpen(true);
  };
  
  const handleDeleteProject = async () => {
    if (!projectToDelete || !userProfile || !db) return;
    const projectRef = doc(db, `clients/${projectToDelete.clientId}/contracts/${projectToDelete.contractId}/projects`, projectToDelete.id);
    try {
        await updateDoc(projectRef, {
            isDeleted: true,
            deletedAt: serverTimestamp(),
            deletedBy: userProfile.uid
        });
        toast({ title: 'Success', description: 'Project has been deleted.' });
        fetchData();
    } catch (error) {
        console.error("Error deleting project: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete project.' });
    } finally {
        setProjectToDelete(null);
    }
  };


  const handleSuccess = () => {
    fetchData();
  }
  
  const visibleProjects = projects.filter(p => !p.isDeleted);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Projects
        </h1>
        {canManage && (
          <Button onClick={handleAddProject}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Project
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Manage all projects across all contracts.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Project List</CardTitle>
          <CardDescription>
            A list of all projects in your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Work Mode</TableHead>
                <TableHead>Created At</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    {canManage && <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : visibleProjects.length > 0 ? (
                visibleProjects.map((project) => (
                  <TableRow key={project.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/clients/${project.clientId}/contracts/${project.contractId}/projects/${project.id}`)}>
                    <TableCell className="font-medium">
                       <Link href={`/dashboard/clients/${project.clientId}/contracts/${project.contractId}/projects/${project.id}`} className="hover:underline text-primary" onClick={(e) => e.stopPropagation()}>
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/clients/${project.clientId}/contracts/${project.contractId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {project.contractName}
                      </Link>
                    </TableCell>
                    <TableCell>
                       <Link href={`/dashboard/clients/${project.clientId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {project.clientName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.workMode === 'Onshore' ? 'secondary' : 'default'}>{project.workMode}</Badge>
                    </TableCell>
                    <TableCell>
                      {/* @ts-ignore */}
                      {formatDate(project.createdAt)}
                    </TableCell>
                    {canManage && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clients/${project.clientId}/contracts/${project.contractId}/projects/${project.id}`); }}>
                                View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center">
                    No projects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <ProjectForm 
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          project={selectedProject}
          contracts={contracts.filter(c => !c.isDeleted)}
          onSuccess={handleSuccess}
        />
      )}

      {projectToDelete && (
         <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this project?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will archive the project '{projectToDelete.name}'. It can be restored later by an administrator. This will not delete its waves.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90">
                        Delete Project
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
