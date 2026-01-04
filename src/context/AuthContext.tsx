
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { type UserProfile } from '@/types/user';
import { type Employee } from '@/types/employee';

interface AuthContextType {
  user: User | null; // Firebase Auth user
  userProfile: UserProfile | null; // Firestore user profile
  employeeProfile: Employee | null; // Firestore employee profile
  loading: boolean; // True while fetching auth state OR user/employee profile
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  employeeProfile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      // Firebase services not ready, stop loading.
      setLoading(false);
      return;
    }

    // Subscribe to Firebase Auth state changes
    const unsubscribeFromAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Subscribe to real-time updates on the user's profile document
        const unsubscribeFromProfile = onSnapshot(userDocRef, async (userDocSnap) => {
          let currentProfile: UserProfile | null = null;

          if (userDocSnap.exists()) {
            currentProfile = { uid: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
          } else {
            // If profile doesn't exist, create it. This is the bootstrap process.
            console.log(`Creating new user profile for ${firebaseUser.email}`);
            const newUserProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
              isAdmin: false,
              roleIds: [],
              status: "ACTIVE",
              createdAt: serverTimestamp() as any, // Firestore will convert this
              updatedAt: serverTimestamp() as any,
            };
            try {
              await setDoc(userDocRef, newUserProfile);
              // After setting, we don't need to re-read. The snapshot listener will fire with the new data.
              // We set it here to avoid a flicker, the listener will just confirm it.
              currentProfile = newUserProfile;
            } catch (error) {
              console.error("Failed to create user document:", error);
              setUserProfile(null);
              setEmployeeProfile(null);
              setLoading(false);
              return;
            }
          }
          
          setUserProfile(currentProfile);

          // Once we have the user profile, check for a linked employee profile
          if (currentProfile && currentProfile.employeeId) {
            const employeeDocRef = doc(db, 'employees', currentProfile.employeeId);
            const employeeDocSnap = await getDoc(employeeDocRef);
            if (employeeDocSnap.exists()) {
              setEmployeeProfile({ id: employeeDocSnap.id, ...employeeDocSnap.data() } as Employee);
            } else {
              console.warn(`User ${firebaseUser.uid} has employeeId ${currentProfile.employeeId} but document not found.`);
              setEmployeeProfile(null);
            }
          } else {
            setEmployeeProfile(null);
          }

          setLoading(false); // All user-related data is now loaded.
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setUserProfile(null);
          setEmployeeProfile(null);
          setLoading(false);
        });

        // Return cleanup function for the profile listener
        return () => unsubscribeFromProfile();

      } else {
        // No Firebase user logged in
        setUser(null);
        setUserProfile(null);
        setEmployeeProfile(null);
        setLoading(false);
      }
    });

    // Return cleanup function for the auth state listener
    return () => unsubscribeFromAuth();
  }, [auth, db]);

  const value = { user, userProfile, employeeProfile, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
