
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { type UserProfile, type RoleCode } from '@/types/user';
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
      if (!auth) console.warn("AuthProvider: Firebase Auth service not available.");
      if (!db) console.warn("AuthProvider: Firestore service not available.");
      setLoading(false);
      return;
    }

    let profileUnsubscribe: Unsubscribe | undefined;
    let employeeUnsubscribe: Unsubscribe | undefined;

    const authUnsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (profileUnsubscribe) profileUnsubscribe();
      if (employeeUnsubscribe) employeeUnsubscribe();

      if (firebaseUser) {
        setLoading(true);
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        profileUnsubscribe = onSnapshot(userDocRef, async (userDocSnap) => {
          let currentProfile: UserProfile | null = null;
          if (userDocSnap.exists()) {
            currentProfile = { uid: userDocSnap.id, ...userDocSnap.data() } as UserProfile;
          } else {
            console.log(`Creating new user profile for ${firebaseUser.email}`);
            
            // Bootstrap logic
            const securityRef = doc(db, 'settings', 'security');
            const securitySnap = await getDoc(securityRef);
            let isBootstrapAdmin = false;
            if (securitySnap.exists()) {
              const securityData = securitySnap.data();
              const allowlist = securityData?.bootstrap?.adminEmailsAllowlist || [];
              if (securityData?.bootstrap?.isOpen === true && firebaseUser.email && allowlist.includes(firebaseUser.email)) {
                isBootstrapAdmin = true;
              }
            }

            const newUserProfileData: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
              isAdmin: isBootstrapAdmin,
              roleIds: [],
              roleCodes: isBootstrapAdmin ? ['ADMIN'] : [],
              status: "ACTIVE",
              createdAt: serverTimestamp() as any,
              updatedAt: serverTimestamp() as any,
            };

            try {
              await setDoc(userDocRef, newUserProfileData);
              // The onSnapshot listener will fire again with the new data.
            } catch (error) {
              console.error("Failed to create user document:", error);
              setUserProfile(null);
              setEmployeeProfile(null);
              setLoading(false);
              return;
            }
          }
          
          setUserProfile(currentProfile);

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
                setLoading(false);
            });
          } else {
            setEmployeeProfile(null);
            setLoading(false);
          }
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setUserProfile(null);
          setEmployeeProfile(null);
          setLoading(false);
        });

      } else {
        setUser(null);
        setUserProfile(null);
        setEmployeeProfile(null);
        setLoading(false);
      }
    });

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
