
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Lock, ShieldAlert } from "lucide-react";
import { collection, collectionGroup, getDocs, doc, updateDoc, serverTimestamp, where, query } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { type ContractWithClient } from "@/types/contract";
import { useEffectOnce } from "react-use";
import ContractForm from "@/components/forms/contract-form";
import { Client } from "@/types/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { canManageOperation } from "@/lib/authz";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


export default function ContractPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractWithClient | null>(null);
  const [contractToDelete, setContractToDelete] = useState<ContractWithClient | null>(null);
  const [contracts, setContracts] = useState<ContractWithClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    try {
      const clientSnapshot = await getDocs(query(collection(db, 'clients'), where('isDeleted', '!=', true)));
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
      }).filter(c => c.clientId); // Filter out contracts whose client might be soft-deleted

      setContracts(contractList);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setError(error.message);
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

  const handleDeleteContract = async () => {
    if (!contractToDelete || !userProfile || !db) return;
    const contractRef = doc(db, 'clients', contractToDelete.clientId, 'contracts', contractToDelete.id);
    try {
      await updateDoc(contractRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: userProfile.uid,
        status: 'DELETED',
      });
      toast({ title: 'Success', description: 'Contract has been deleted.' });
      fetchData(); // refetch
    } catch (error) {
      console.error("Error deleting contract: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete contract.' });
    } finally {
      setContractToDelete(null);
    }
  };
  
  const visibleContracts = contracts.filter(c => !c.isDeleted);

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

      {error && (
         <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2"><ShieldAlert />Error Loading Contracts</CardTitle>
                <CardDescription className="text-destructive">
                    There was a problem fetching the contract list. Please check the console or contact support.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <pre className="text-xs text-destructive-foreground bg-destructive p-2 rounded-md">{error}</pre>
            </CardContent>
        </Card>
      )}

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
              ) : visibleContracts.length > 0 ? (
                visibleContracts.map((contract) => (
                  <TableRow key={contract.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/clients/${contract.clientId}/contracts/${contract.id}`)}>
                    <TableCell className="font-medium">
                       <Link href={`/dashboard/clients/${contract.clientId}/contracts/${contract.id}`} className="hover:underline text-primary flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {contract.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        {contract.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/clients/${contract.clientId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {contract.clientName}
                      </Link>
                    </TableCell>
                    <TableCell>
                       <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>{contract.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(contract.createdAt)}
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
                           <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clients/${contract.clientId}/contracts/${contract.id}`); }}>
                                View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditContract(contract); }}>
                            Edit
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setContractToDelete(contract); }}>
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
       {contractToDelete && (
        <AlertDialog open={!!contractToDelete} onOpenChange={() => setContractToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this contract?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will archive the contract '{contractToDelete.name}'. It can be restored later by an administrator.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive hover:bg-destructive/90">
                        Delete Contract
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
