"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Lock } from "lucide-react";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { type ContractWithClient } from "@/types/contract";
import { useEffectOnce } from "react-use";
import ContractForm from "@/components/forms/contract-form";
import { Client } from "@/types/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function ContractPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractWithClient | null>(null);
  const [contracts, setContracts] = useState<ContractWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const db = useFirestore();
  const { userProfile } = useAuth();
  
  const canManage = userProfile?.role === 'admin' || userProfile?.role === 'operationManager';
  
  const fetchData = async () => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const clientSnapshot = await getDocs(collection(db, 'clients'));
      const clientList = clientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(clientList);

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
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffectOnce(() => {
    fetchData();
  });
  
  const handleAddContract = () => {
    setSelectedContract(null);
    setIsFormOpen(true);
  };

  const handleEditContract = (contract: ContractWithClient) => {
    setSelectedContract(contract);
    setIsFormOpen(true);
  };
  
  const handleSuccess = () => {
    fetchData(); // Refetch data on success
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Contracts
        </h1>
        {canManage && (
          <Button onClick={handleAddContract}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Contract
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Manage all client contracts and their terms.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Contract List</CardTitle>
          <CardDescription>
            A list of all contracts in your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
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
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    {canManage && <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : contracts.length > 0 ? (
                contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                       <Link href={`/dashboard/clients/${contract.clientId}/contracts/${contract.id}`} className="hover:underline text-primary flex items-center gap-2">
                        {contract.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {contract.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/clients/${contract.clientId}`} className="hover:underline">
                        {contract.clientName}
                      </Link>
                    </TableCell>
                    <TableCell>
                       <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>{contract.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {contract.createdAt?.toDate().toLocaleDateString()}
                    </TableCell>
                    {canManage && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem>
                             <Link href={`/dashboard/clients/${contract.clientId}/contracts/${contract.id}`} className="w-full h-full">
                                View Details
                              </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditContract(contract)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
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
                  <TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center">
                    No contracts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <ContractForm 
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          contract={selectedContract}
          clients={clients}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
