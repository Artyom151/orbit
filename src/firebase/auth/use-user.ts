
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useAuth, useDatabase } from '../provider';
import { ref, onValue, off } from 'firebase/database';

export type AppUser = User & {
    username?: string;
    avatar?: string;
    name?: string;
    bio?: string;
    coverPhoto?: string;
    onboardingCompleted?: boolean;
    role?: 'user' | 'moderator' | 'developer';
}

export function useUser() {
  const auth = useAuth();
  const db = useDatabase();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        if (!db) {
            setUser(authUser);
            setLoading(false);
            return;
        }
        const userRef = ref(db, 'users/' + authUser.uid);
        
        const unsubscribeDb = onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                setUser({
                    ...authUser,
                    username: userData.username,
                    photoURL: userData.avatar || authUser.photoURL,
                    displayName: userData.name || authUser.displayName,
                    bio: userData.bio,
                    coverPhoto: userData.coverPhoto,
                    onboardingCompleted: userData.onboardingCompleted,
                    role: userData.role,
                });
            } else {
                 setUser(authUser);
            }
            setLoading(false);
        }, (error) => {
            console.error("DB error in useUser:", error);
            setUser(authUser); 
            setLoading(false);
        });

        return () => {
            off(userRef, 'value', unsubscribeDb);
        };

      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, db]);

  return { user, loading };
}
