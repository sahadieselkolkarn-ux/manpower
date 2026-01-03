
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
        // Force a token refresh to get latest custom claims
        await firebaseUser.getIdToken(true);
        setUser(firebaseUser);
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const userDoc = await getDoc(userDocRef);

        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map(email => email.trim().toLowerCase())
            .filter(email => email);

        const isDesignatedAdmin = firebaseUser.email ? adminEmails.includes(firebaseUser.email.toLowerCase()) : false;
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (isDesignatedAdmin && !userData.isAdmin) {
                console.log(`Promoting user ${firebaseUser.email} to admin.`);
                await updateDoc(userDocRef, { isAdmin: true });
            }
        } else {
          console.log(`Creating new user profile for ${firebaseUser.email}`);
          try {
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              isAdmin: isDesignatedAdmin, 
              roleIds: [],
              status: "ACTIVE",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
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
