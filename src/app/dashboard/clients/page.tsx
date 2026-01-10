
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { collection, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { type Client } from "@/types/client";
import { useAuth } from "@/context/AuthContext";
import ClientForm from "@/components/forms/client-form";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { canManageOperation } from "@/lib/authz";
import { useToast } from "@/hooks/use-toast";
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


export default function ClientPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const router = useRouter();

  const db = useFirestore();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const clientsQuery = useMemoFirebase(() => db ? query(collection(db, 'clients'), where('isDeleted', '!=', true)) : null, [db]);
  const { data: clients, isLoading, refetch } = useCollection<Client>(clientsQuery);
  
  const handleAddClient = () => {
    setSelectedClient(null);
    setIsFormOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete || !userProfile) return;
    const clientRef = doc(db, 'clients', clientToDelete.id);
    try {
      await updateDoc(clientRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: userProfile.uid,
      });
      toast({ title: 'Success', description: 'Client has been deleted.' });
      refetch();
    } catch (error) {
      console.error("Error deleting client: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete client.' });
    } finally {
      setClientToDelete(null);
    }
  };
  
  const canManage = canManageOperation(userProfile);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Customers (ลูกค้า)
        </h1>
        {canManage && (
          <Button onClick={handleAddClient}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Manage your customers and their contracts.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>
            A list of all customers in your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Short Name</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    {canManage && <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : clients && clients.length > 0 ? (
                clients.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                    <TableCell className="font-medium">
                       <Link href={`/dashboard/clients/${client.id}`} className="hover:underline text-primary" onClick={(e) => e.stopPropagation()}>
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.shortName}</TableCell>
                    <TableCell>{client.createdBy}</TableCell>
                    <TableCell>
                      {formatDate(client.createdAt)}
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
                           <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clients/${client.id}`); }}>
                                View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClient(client); }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setClientToDelete(client); }}>
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
                  <TableCell colSpan={canManage ? 5: 4} className="h-24 text-center">
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && (
        <ClientForm 
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          client={selectedClient}
          onSuccess={refetch}
        />
      )}
       {clientToDelete && (
        <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this customer?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will archive the customer '{clientToDelete.name}'. It can be restored later.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive hover:bg-destructive/90">
                        Delete Customer
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
