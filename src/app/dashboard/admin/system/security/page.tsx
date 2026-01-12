'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, CheckCircle, Lock, Unlock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import FullPageLoader from '@/components/full-page-loader';

interface SecuritySettings {
  bootstrap: {
    isOpen: boolean;
    adminEmailsAllowlist: string[];
  };
}

export default function SecuritySettingsPage() {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [allowlistText, setAllowlistText] = useState('');
  const [docExists, setDocExists] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const securityDocRef = db ? doc(db, 'settings', 'security') : null;

  const fetchSettings = async () => {
    if (!securityDocRef) return;
    setIsLoading(true);
    try {
      const docSnap = await getDoc(securityDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SecuritySettings;
        setSettings(data);
        setAllowlistText(data.bootstrap.adminEmailsAllowlist.join('\n'));
        setDocExists(true);
      } else {
        setSettings(null);
        setDocExists(false);
      }
    } catch (error) {
      console.error("Error fetching security settings:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch security settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.isAdmin) {
      fetchSettings();
    } else {
        setIsLoading(false);
    }
  }, [userProfile, db]);

  const handleCreateSettings = async () => {
    if (!securityDocRef) return;
    const initialSettings: SecuritySettings = {
      bootstrap: {
        isOpen: true,
        adminEmailsAllowlist: ["sahadieselkolkarn@gmail.com"],
      },
    };
    try {
      await setDoc(securityDocRef, initialSettings);
      toast({ title: 'Success', description: 'Security settings document created.' });
      fetchSettings();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create settings document.' });
    }
  };

  const handleSaveAllowlist = async () => {
    if (!securityDocRef) return;
    const newAllowlist = allowlistText.split('\n').map(email => email.trim()).filter(Boolean);
    try {
      await setDoc(securityDocRef, { bootstrap: { adminEmailsAllowlist: newAllowlist } }, { merge: true });
      toast({ title: 'Success', description: 'Admin allowlist updated.' });
      fetchSettings();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update allowlist.' });
    }
  };

  const handleSetBootstrapOpen = async (isOpen: boolean) => {
    if (!securityDocRef) return;
    try {
      await setDoc(securityDocRef, { bootstrap: { isOpen } }, { merge: true });
      toast({ title: 'Success', description: `Bootstrap is now ${isOpen ? 'OPEN' : 'LOCKED'}.` });
      fetchSettings();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not change bootstrap status.' });
    }
  };
  
  if (authLoading || isLoading) {
      return <FullPageLoader />;
  }

  if (!userProfile?.isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="m-4 text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <ShieldAlert className="text-destructive" /> Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent><p>You do not have permission to view this page.</p></CardContent>
        </Card>
      </div>
    );
  }
  
  if (!docExists) {
      return (
          <div className="flex flex-1 items-center justify-center p-8">
              <Card>
                  <CardHeader><CardTitle>Settings Not Found</CardTitle></CardHeader>
                  <CardContent>
                      <p className="mb-4">The `settings/security` document does not exist.</p>
                      <Button onClick={handleCreateSettings}>Create Default Settings</Button>
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">System Security</h1>
          <p className="text-muted-foreground">Manage admin bootstrap settings.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bootstrap Status</CardTitle>
          <CardDescription>
            This setting controls whether new users from the allowlist can become admins upon signup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            {settings?.bootstrap.isOpen ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <Lock className="h-8 w-8 text-destructive" />
            )}
            <div>
              <p className="font-bold text-lg">
                Bootstrap is currently {settings?.bootstrap.isOpen ? 'OPEN' : 'LOCKED'}
              </p>
              <p className="text-sm text-muted-foreground">
                {settings?.bootstrap.isOpen
                  ? 'New users in the allowlist will be granted admin rights on signup.'
                  : 'New users cannot become admins automatically.'}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
            <Button variant="destructive" onClick={() => handleSetBootstrapOpen(false)} disabled={!settings?.bootstrap.isOpen}>
                <Lock className="mr-2" /> Lock Bootstrap
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={settings?.bootstrap.isOpen}>
                        <Unlock className="mr-2" /> Open Bootstrap
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Opening the bootstrap process is a security risk and should only be done to provision initial admin accounts.
                            Once complete, it should be locked immediately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSetBootstrapOpen(true)}>Yes, Open Bootstrap</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Admin Email Allowlist</CardTitle>
          <CardDescription>
            Enter one email per line. These emails can become admins if bootstrap is open.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Textarea
                value={allowlistText}
                onChange={(e) => setAllowlistText(e.target.value)}
                rows={5}
                placeholder="user1@example.com&#10;user2@example.com"
            />
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveAllowlist}>Save Allowlist</Button>
        </CardFooter>
      </Card>

    </div>
  );
}
