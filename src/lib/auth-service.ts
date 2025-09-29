
'use client';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { app, db } from '@/firebase/config';
import { ref, set, get, serverTimestamp, update, query, orderByChild, equalTo } from "firebase/database";
import type { Track, ProfileTheme } from './types';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const DEVELOPER_USERNAMES = ['nevermoreanarchy', 'orbit-developer'];

async function storeUserInDatabase(user: User) {
  const userRef = ref(db, 'users/' + user.uid);
  const userSnap = await get(userRef);
  const username = user.email?.split('@')[0] || `user_${Date.now()}`;
  const isDeveloper = DEVELOPER_USERNAMES.includes(username);

  if (!userSnap.exists()) {
    // User is new, create a new record
    try {
      await set(userRef, {
        name: user.displayName || username,
        email: user.email,
        avatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        username: username,
        bio: "Just joined Orbit!",
        createdAt: serverTimestamp(),
        onboardingCompleted: false, // New field
        role: isDeveloper ? 'developer' : 'user',
      });
    } catch (error) {
      console.error("Failed to store user in database:", error);
    }
  } else {
    // User exists, check if their role needs to be updated
    const userData = userSnap.val();
    if (isDeveloper && userData.role !== 'developer') {
        try {
            await update(userRef, { role: 'developer' });
        } catch (error) {
            console.error("Failed to update user role:", error);
        }
    }
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    await storeUserInDatabase(result.user);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google', error);
    throw error;
  }
}

export async function signUpWithEmailAndPassword(email: string, password: string) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await storeUserInDatabase(result.user);
        return result.user;
    } catch (error) {
        console.error('Error signing up with email and password', error);
        throw error;
    }
}

export async function signInWithEmailAndPassword(email: string, password: string) {
    try {
        const result = await firebaseSignInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        console.error('Error signing in with email and password', error);
        throw error;
    }
}


export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
}

export async function isUsernameTaken(username: string): Promise<boolean> {
    if (!db) return false;
    const usersRef = ref(db, 'users');
    const usernameQuery = query(usersRef, orderByChild('username'), equalTo(username));
    const snapshot = await get(usernameQuery);
    return snapshot.exists();
}


export async function updateUserProfile(userId: string, data: Partial<{ name: string; username: string; bio: string; avatar: string; coverPhoto: string | undefined; profileBackground: string; onboardingCompleted: boolean; role: 'user' | 'moderator' | 'developer', profileSong: Track | null, storyBorder: any, profileTheme: any, pinnedPostId: string | null }>) {
    if(!db) throw new Error("Database not connected");
    const userRef = ref(db, 'users/' + userId);
    const updateData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (Object.keys(updateData).length === 0) {
        return; 
    }

    try {
        await update(userRef, updateData);
    } catch (error) {
        console.error("Failed to update user profile:", error);
        throw error;
    }
}
