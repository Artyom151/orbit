
'use client';
import { useEffect, useState, useMemo } from 'react';
import { onValue, Query } from 'firebase/database';

export function useList<T>(query?: Query | null) {
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
    const unsubscribe = onValue(memoizedQuery, 
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const val = snapshot.val();
            const result: T[] = Object.keys(val).map(key => ({
                id: key,
                ...val[key]
            }));
            setData(result as T[]);
          } else {
            setData([]);
          }
        } catch (e: any) {
          setError(e);
          console.error("Error processing list snapshot:", e);
        } finally {
            setLoading(false);
        }
      },
      (err: Error) => {
        console.error("Error in useList snapshot listener:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  return { data, loading, error };
}
