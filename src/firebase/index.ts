
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  let firebaseApp;
  if (!getApps().length) {
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  // Log the projectId for debugging purposes
  console.log('[firebase] projectId =', firebaseApp.options.projectId);

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  let firestore;
  try {
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    });
  } catch (e) {
    firestore = getFirestore(firebaseApp);
  }
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore,
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
