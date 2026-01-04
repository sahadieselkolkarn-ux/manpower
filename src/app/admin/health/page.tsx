// src/app/admin/health/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirestore, useAuth } from '@/firebase';
import { hasPermission } from '@/lib/rbac/permissions';
import { useRouter } from 'next/navigation';

export default function AdminHealthPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const db = useFirestore();
  
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile && !hasPermission(userProfile, 'ADMIN_ACCESS')) {
      router.replace('/dashboard');
      return;
    }
    
    if (userProfile && db) {
        const checkHealth = async () => {
            setLoading(true);
            setError(null);
            try {
                const settingsRef = doc(db, 'settings', 'security');
                const settingsSnap = await getDoc(settingsRef);

                setHealthData({
                    firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    uid: userProfile.uid,
                    email: userProfile.email,
                    isAdmin: userProfile.isAdmin,
                    roleIds: userProfile.roleIds,
                    bootstrapIsOpen: settingsSnap.exists() ? settingsSnap.data().bootstrap?.isOpen : 'NOT_FOUND',
                    firestoreReadTest: 'OK'
                });
            } catch (e: any) {
                setError(`Firestore Read Test Failed: ${e.message}`);
            } finally {
                setLoading(false);
            }
        };
        checkHealth();
    }
  }, [userProfile, router, db]);
  
  const createSettings = async () => {
    if (!db) return;
    try {
      const settingsRef = doc(db, 'settings', 'security');
      await setDoc(settingsRef, {
        bootstrap: {
          isOpen: true,
          adminEmailsAllowlist: ["sahadiesel@gmail.com"]
        }
      });
      alert('Security settings created successfully!');
      // Re-run health check
      router.refresh();
    } catch (e: any) {
      alert(`Failed to create settings: ${e.message}`);
    }
  };

  const lockBootstrap = async () => {
    if (!db) return;
    try {
      const settingsRef = doc(db, 'settings', 'security');
      await setDoc(settingsRef, { bootstrap: { isOpen: false } }, { merge: true });
      alert('Bootstrap locked successfully!');
      router.refresh();
    } catch (e: any) {
      alert(`Failed to lock bootstrap: ${e.message}`);
    }
  };

  if (loading) return <p>Loading health check...</p>;

  return (
    <div>
      <h1>Admin Health Check</h1>
      {error && <p style={{color: 'red'}}>Error: {error}</p>}
      {healthData && (
        <pre>{JSON.stringify(healthData, null, 2)}</pre>
      )}
      <hr/>
      <h2>Actions</h2>
      <button onClick={createSettings}>Create Missing settings/security Doc</button>
      <br/><br/>
      <button onClick={lockBootstrap}>Lock Bootstrap (isOpen: false)</button>
    </div>
  );
}
