
"use client";

import { use, useEffect, useState } from "react";
import {
  doc,
  DocumentReference,
  collection,
  collectionGroup,
  getDocs,
} from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { type Client } from "@/types/client";
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
import { ArrowLeft, MoreHorizontal, PlusCircle, Mail, Phone, Building, User } from "lucide-react";
import FullPageLoader from "@/components/full-page-loader";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { type Contract } from "@/types/contract";
import { type ProjectWithContract } from "@/types/project";
import ContractForm from "@/components/forms/contract-form";
import { ContractWithClient } from "@/types/contract";
import ProjectForm from "@/components/forms/project-form";
import { canManageOperation } from "@/lib/authz";

export default function ClientDetailsPage({ params }: { params: Promise<{ clientId: string }> }) {
  const resolvedParams = use(params);
  const { clientId } = resolvedParams;

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<ProjectWithContract[]>([]);
  const [isContractFormOpen, setIsContractFormOpen] = useState(false);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);

  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();

  const clientRef = useMemoFirebase(
    () =>
      db && clientId
        ? (doc(db, "clients", clientId) as DocumentReference<Client>)
        : null,
    [db, clientId]
  );

  const {
    data: client,
    isLoading: isLoadingClient,
    error: clientError,
  } = useDoc<Client>(clientRef);

  const canManage = canManageOperation(userProfile);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const fetchData = async () => {
    if (!db || !clientId) return;
    setIsDataLoading(true);

    // Fetch Contracts
    const contractsRef = collection(db, "clients", clientId, "contracts");
    const contractsSnap = await getDocs(contractsRef);
    const contractsList = contractsSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Contract)
    );
    setContracts(contractsList);

    // Fetch Projects
    const projectsList: ProjectWithContract[] = [];
    for (const contract of contractsList) {
      const projectsRef = collection(
        db,
        "clients",
        clientId,
        "contracts",
        contract.id,
        "projects"
      );
      const projectsSnap = await getDocs(projectsRef);
      projectsSnap.forEach((doc) => {
        projectsList.push({
          id: doc.id,
          ...doc.data(),
          contractId: contract.id,
          contractName: contract.name,
          clientId: clientId,
          clientName: client?.name || "",
        } as ProjectWithContract);
      });
    }
    setProjects(projectsList);

    setIsDataLoading(false);
  };

  useEffect(() => {
    if (client) {
      fetchData();
    }
  }, [client, clientId, db]);

   const handleSuccess = () => {
    fetchData(); // Refetch data
  };


  if (isLoadingClient || authLoading) {
    return <FullPageLoader />;
  }

  if (clientError) {
    return (
      <div className="p-8 text-destructive">
        Error loading client: {clientError.message}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <h1 className="text-2xl font-bold">Client Not Found</h1>
        <p>
          The client with ID{" "}
          <span className="font-mono bg-muted p-1 rounded">{clientId}</span>{" "}
          could not be found.
        </p>
        <Button
          onClick={() => (window.location.href = "/dashboard/clients")}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <header>
          <Link href="/dashboard/clients" className="text-sm text-muted-foreground hover:underline flex items-center gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-headline">
                {client.name}
              </h1>
              <p className="text-muted-foreground">
                {client.shortName || "Client Overview"}
              </p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsContractFormOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Contract
                </Button>
                 <Button onClick={() => setIsProjectFormOpen(true)} disabled={contracts.length === 0}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Project
                </Button>
              </div>
            )}
          </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
            {/* Contracts Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Contracts</CardTitle>
                  <CardDescription>
                    List of all contracts for this client.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract Name</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Projects</TableHead>
                      {canManage && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isDataLoading ? (
                      <TableRow>
                        <TableCell colSpan={canManage ? 4 : 3}>Loading contracts...</TableCell>
                      </TableRow>
                    ) : contracts.length > 0 ? (
                      contracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">
                            <Link href={`/dashboard/clients/${clientId}/contracts/${contract.id}`} className="hover:underline text-primary">
                              {contract.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {contract.createdAt?.toDate().toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                              {projects.filter(p => p.contractId === contract.id).length}
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
                        <TableCell colSpan={canManage ? 4 : 3} className="h-24 text-center">
                          No contracts found for this client.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

              {/* Projects Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>
                    List of all projects for this client across all contracts.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Waves</TableHead>
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
                            <Link href={`/dashboard/clients/${clientId}/contracts/${project.contractId}/projects/${project.id}`} className="hover:underline text-primary">
                              {project.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Link href={`/dashboard/clients/${clientId}/contracts/${project.contractId}`} className="hover:underline">
                              {project.contractName}
                            </Link>
                          </TableCell>
                          <TableCell>0</TableCell>
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
                          No projects found for this client.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Client Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <h4 className="text-sm font-semibold mb-1">Tax ID</h4>
                        <p className="text-sm text-muted-foreground">{client.taxId || 'N/A'}</p>
                    </div>
                     <div>
                        <h4 className="text-sm font-semibold mb-1">Billing Address</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{client.address || 'N/A'}</p>
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Contacts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {client.contacts && client.contacts.length > 0 ? (
                        client.contacts.map((contact, index) => (
                            <div key={index} className="space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{contact.name}</p>
                                        <p className="text-xs text-muted-foreground">{contact.department}</p>
                                    </div>
                                </div>
                                {contact.email && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                                    </div>
                                )}
                                {contact.phone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <span>{contact.phone}</span>
                                    </div>
                                )}
                                {index < client.contacts!.length - 1 && <hr className="my-2" />}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No contacts available.</p>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
      
      {canManage && (
          <>
            <ContractForm
                open={isContractFormOpen}
                onOpenChange={setIsContractFormOpen}
                clients={[{...client, id: clientId}]}
                onSuccess={handleSuccess}
            />
            <ProjectForm
                open={isProjectFormOpen}
                onOpenChange={setIsProjectFormOpen}
                contracts={contracts.map(c => ({...c, clientId, clientName: client.name}))}
                onSuccess={handleSuccess}
            />
          </>
      )}

    </div>
  );
}
