'use client';

import { useEffect, useState, useMemo } from 'react';
import { onSnapshot, Query } from 'firebase/firestore';

export function useCollection<T>(query?: Query | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedQuery = useMemo(() => query, [query]);

  useEffect(() => {
    if (!memoizedQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(memoizedQuery, 
      (snapshot) => {
        try {
          const result: T[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          } as T));
          setData(result);
          setError(null);
        } catch (e: any) {
          setError(e);
          console.error("Error processing collection snapshot:", e);
        } finally {
            setLoading(false);
        }
      },
      (err: Error) => {
        console.error("Error in useCollection snapshot listener:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  return { data, loading, error };
}
