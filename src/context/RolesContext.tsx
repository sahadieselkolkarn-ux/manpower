
'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { type Role } from '@/types/user';
import { useAuth } from './AuthContext';

interface RolesContextType {
  roles: Role[]; // All roles for admins, specific roles for others
  rolesById: Map<string, Role>; // All roles by ID for admins, specific for others
  isLoading: boolean;
  error: Error | null;
}

const RolesContext = createContext<RolesContextType>({
  roles: [],
  rolesById: new Map(),
  isLoading: true,
  error: null,
});

export const RolesProvider = ({ children }: { children: ReactNode }) => {
  const db = useFirestore();
  const { userProfile, loading: authLoading } = useAuth();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading || !db) return; // Wait for auth context and db

    const fetchRoles = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (userProfile?.isAdmin) {
          // Admins fetch all roles
          const rolesSnapshot = await getDocs(collection(db, 'roles'));
          const allRoles = rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Role));
          setRoles(allRoles);
        } else if (userProfile?.roleIds && userProfile.roleIds.length > 0) {
          // Regular users fetch only their specific roles
          const rolePromises = userProfile.roleIds.map(roleId => getDoc(doc(db, 'roles', roleId)));
          const roleSnapshots = await Promise.all(rolePromises);
          const userRoles = roleSnapshots
            .filter(snap => snap.exists())
            .map(snap => ({ id: snap.id, ...snap.data() } as Role));
          setRoles(userRoles);
        } else {
          // User has no roles
          setRoles([]);
        }
      } catch (e) {
        console.error("Failed to fetch roles:", e);
        setError(e instanceof Error ? e : new Error("An unknown error occurred while fetching roles."));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoles();

  }, [db, userProfile, authLoading]);

  const rolesById = useMemo(() => new Map(roles.map(role => [role.id, role])), [roles]);

  const value = {
    roles,
    rolesById,
    isLoading,
    error,
  };

  return <RolesContext.Provider value={value}>{children}</RolesContext.Provider>;
};

export const useRoles = () => {
  const context = useContext(RolesContext);
  if (context === undefined) {
    throw new Error('useRoles must be used within a RolesProvider');
  }
  return context;
};
