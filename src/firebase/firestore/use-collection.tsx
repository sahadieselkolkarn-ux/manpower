
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' and optional 'path' field to a given type T. */
export type WithId<T> = T & { id: string; path?: string };


/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  refetch: () => void;      // Function to manually refetch data.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    collectionGroup?: string;
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

function getPathFromRefOrQuery(refOrQuery: CollectionReference | Query): string | null {
    const internalQuery = refOrQuery as unknown as InternalQuery;

    if (refOrQuery.type === 'collection') {
        return (refOrQuery as CollectionReference).path;
    }
    
    // Handle collectionGroup queries, which may not have a standard path.
    if (internalQuery._query?.collectionGroup) {
        return `collectionGroup:${internalQuery._query.collectionGroup}`;
    }

    if (internalQuery._query?.path) {
        return internalQuery._query.path.canonicalString();
    }

    return null;
}


/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const refetch = useCallback(() => setRefetchIndex(prev => prev + 1), []);

  useEffect(() => {
    // Primary guard: If the query/ref object itself is null, do nothing.
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Secondary guard: Extract path.
    let path = getPathFromRefOrQuery(memoizedTargetRefOrQuery);

    // If path is still null or an explicit root query, do not proceed.
    // This allows collectionGroup queries (which have a non-null, non-root path like "collectionGroup:waves") to pass.
    if (path === '/') {
        setData(null);
        setIsLoading(false);
        setError(new Error('Invalid Firestore path provided to useCollection (root queries are not supported).'));
        return;
    }
    
    // For logging/debugging, ensure path is never null for the error handler.
    if (path === null) {
      path = '(unknown)';
    }


    setIsLoading(true);
    setError(null);

    // Directly use memoizedTargetRefOrQuery as it's assumed to be the final query
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id, path: doc.ref.path });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path!, // Use the path we already validated/set
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // trigger global error propagation
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, refetchIndex]); // Re-run if the target query/reference changes or on refetch
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error('A non-null query/reference was passed to useCollection without being memoized. Use useMemoFirebase to wrap your query.');
  }

  return { data, isLoading, error, refetch };
}
