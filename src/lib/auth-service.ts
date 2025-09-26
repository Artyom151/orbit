
'use client';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { app, db } from '@/firebase/config';
import { ref, set, get, serverTimestamp, update } from "firebase/database";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

async function storeUserInDatabase(user: User) {
  const userRef = ref(db, 'users/' + user.uid);
  const userSnap = await get(userRef);

  if (!userSnap.exists()) {
    // User is new, create a new record
    const username = user.email?.split('@')[0] || `user_${Date.now()}`;
    const isDeveloper = user.email === 'developer@orbit.com';

    try {
      await set(userRef, {
        name: user.displayName || "New User",
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
  }
  // If user exists, we can optionally update their info here if needed
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    await storeUserInDatabase(result.user);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google', error);
    return null;
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
  }
}

export async function updateUserProfile(userId: string, data: Partial<{ name: string; username: string; bio: string; avatar: string; coverPhoto: string; onboardingCompleted: boolean; role: 'user' | 'moderator' | 'developer' }>) {
    if(!db) throw new Error("Database not connected");

    const userRef = ref(db, 'users/' + userId);
    
    // Create an object with only the fields that are not undefined.
    const updateData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));


    if (Object.keys(updateData).length === 0) {
        return; // Nothing to update
    }

    try {
        await update(userRef, updateData);
    } catch (error) {
        console.error("Failed to update user profile:", error);
        throw error;
    }
}
