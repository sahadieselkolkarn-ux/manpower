
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
      if (!auth) console.warn("AuthProvider: Firebase Auth service not available.");
      if (!db) console.warn("AuthProvider: Firestore service not available.");
      setLoading(false);
      return;
    }

    let profileUnsubscribe: Unsubscribe | undefined;
    let employeeUnsubscribe: Unsubscribe | undefined;

    // Subscribe to Firebase Auth state changes
    const authUnsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      // Clean up previous listeners
      if (profileUnsubscribe) profileUnsubscribe();
      if (employeeUnsubscribe) employeeUnsubscribe();

      if (firebaseUser) {
        setLoading(true);
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Subscribe to real-time updates on the user's profile document
        profileUnsubscribe = onSnapshot(userDocRef, async (userDocSnap) => {
          let currentProfile: UserProfile | null = null;
          if (userDocSnap.exists()) {
            currentProfile = { uid: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
          } else {
            // If profile doesn't exist, create it. This is the bootstrap process.
            console.log(`Creating new user profile for ${firebaseUser.email}`);
            const newUserProfileData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
              isAdmin: false,
              roleIds: [],
              status: "ACTIVE" as const,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            try {
              await setDoc(userDocRef, newUserProfileData);
              // The onSnapshot listener will fire again with the new data, so we don't set state here.
              // The component will naturally re-render with the newly created profile.
            } catch (error) {
              console.error("Failed to create user document:", error);
              setUserProfile(null);
              setEmployeeProfile(null);
              setLoading(false); // Stop loading on error
              return;
            }
          }
          
          setUserProfile(currentProfile);

          // Once we have the user profile, check for a linked employee profile
          // Clean up previous employee listener before creating a new one
          if (employeeUnsubscribe) employeeUnsubscribe();

          if (currentProfile && currentProfile.employeeId) {
            const employeeDocRef = doc(db, 'employees', currentProfile.employeeId);
            employeeUnsubscribe = onSnapshot(employeeDocRef, (employeeDocSnap) => {
                if (employeeDocSnap.exists()) {
                    setEmployeeProfile({ id: employeeDocSnap.id, ...employeeDocSnap.data() } as Employee);
                } else {
                    console.warn(`User ${firebaseUser.uid} has employeeId ${currentProfile?.employeeId} but document not found.`);
                    setEmployeeProfile(null);
                }
                setLoading(false); // All user-related data is now loaded.
            });
          } else {
            setEmployeeProfile(null);
            setLoading(false); // No employee to load, so we're done.
          }
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setUserProfile(null);
          setEmployeeProfile(null);
          setLoading(false);
        });

      } else {
        // No Firebase user logged in
        setUser(null);
        setUserProfile(null);
        setEmployeeProfile(null);
        setLoading(false);
      }
    });

    // Return cleanup function for the auth state listener
    return () => {
        authUnsubscribe();
        if (profileUnsubscribe) profileUnsubscribe();
        if (employeeUnsubscribe) employeeUnsubscribe();
    };
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
