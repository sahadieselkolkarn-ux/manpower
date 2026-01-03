
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Unsubscribe, updateDoc } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { type UserProfile } from '@/types/user';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribeFromAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const userDoc = await getDoc(userDocRef);

        // This is the migration logic block.
        if (userDoc.exists() && userDoc.data().role === 'admin' && userDoc.data().isAdmin === undefined) {
          // Legacy admin user found. Upgrade their document.
          console.log("Legacy admin user detected. Upgrading profile...");
          await updateDoc(userDocRef, {
            isAdmin: true,
            role: null // Or delete the field entirely if preferred
          });
          // The onSnapshot listener below will automatically pick up this change.
        } else if (!userDoc.exists()) {
          // User document does not exist, create it.
          try {
            const isAdmin = firebaseUser.email?.toLowerCase() === 'sahadiesel@gmail.com';
            
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              isAdmin: isAdmin,
              roleIds: [],
              createdAt: serverTimestamp(),
            });
          } catch (error) {
            console.error("Failed to create user document:", error);
            setUserProfile(null);
            setLoading(false);
            return;
          }
        }
        
        const unsubscribeFromProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setUserProfile(null);
          setLoading(false);
        });
        
        return () => unsubscribeFromProfile();

      } else {
        // User is signed out.
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeFromAuth();
  }, [auth, db]);

  const value = { user, userProfile, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
