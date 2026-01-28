
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from '@/firebase/config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // This logic is now ENTIRELY client-side due to the 'use client' directive.
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    let firestore;
    try {
      firestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        useFetchStreams: false,
      });
    } catch (e) {
      firestore = getFirestore(app);
    }

    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: firestore,
      storage: getStorage(app),
    };
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
