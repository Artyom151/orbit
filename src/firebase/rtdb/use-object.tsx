
'use client';

import { useEffect, useState, useMemo } from 'react';
import { onValue, DatabaseReference, runTransaction } from 'firebase/database';

export function useObject<T>(ref: DatabaseReference | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedRef = useMemo(() => ref, [ref]);

  useEffect(() => {
    if (!memoizedRef) {
      setData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);

    const unsubscribe = onValue(memoizedRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.key, ...snapshot.val() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error in useObject snapshot listener:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedRef]);

  return { data, loading, error };
}
