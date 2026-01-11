
'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It shows a toast for transient read errors and other errors, without crashing the app.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // For transient read errors that often happen during initial load before auth is ready,
      // just show a gentle toast instead of crashing the app.
      if (error.request.method === 'list' || error.request.method === 'get') {
        console.warn('Transient Firestore Permission Error:', error.message);
        toast({
          title: 'Permission Issue',
          description: `Could not fetch some data. This can happen during page load. Retrying automatically.`,
          variant: 'default',
        });
      } else {
        // For write/update/delete operations, the error is more critical.
        // We still don't throw it to prevent a full app crash, but we use a destructive toast.
        console.error('Critical Firestore Permission Error:', error);
        toast({
          title: 'Permission Denied',
          description: error.message,
          variant: 'destructive',
          duration: 10000,
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);


  // This component renders nothing.
  return null;
}
