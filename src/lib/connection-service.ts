
import { Database, ref, remove, serverTimestamp, set } from "firebase/database";

export const sendConnectionRequest = async (db: Database, currentUserId: string, otherUserId: string) => {
    // We create a pending request in our list, so we know we sent it.
    const myConnectionRef = ref(db, `connections/${currentUserId}/${otherUserId}`);
    await set(myConnectionRef, { status: 'pending', createdAt: serverTimestamp() });
    
    // We also create a pending request in their list, so they get notified.
    const theirConnectionRef = ref(db, `connections/${otherUserId}/${currentUserId}`);
    await set(theirConnectionRef, { status: 'pending', createdAt: serverTimestamp() });
}

export const acceptConnection = async (db: Database, currentUserId: string, otherUserId: string) => {
    const myConnectionRef = ref(db, `connections/${currentUserId}/${otherUserId}`);
    const theirConnectionRef = ref(db, `connections/${otherUserId}/${currentUserId}`);
    
    // Update both records to 'accepted'
    await set(myConnectionRef, { status: 'accepted', createdAt: serverTimestamp() });
    await set(theirConnectionRef, { status: 'accepted', createdAt: serverTimestamp() });
};

export const removeConnection = async (db: Database, currentUserId: string, otherUserId: string, areFriends: boolean) => {
    const myConnectionRef = ref(db, `connections/${currentUserId}/${otherUserId}`);
    const theirConnectionRef = ref(db, `connections/${otherUserId}/${currentUserId}`);

    // If they are friends, remove both records to unfriend them.
    // If not friends (i.e., cancelling a request), only remove the outgoing request.
    await remove(myConnectionRef);
    if (areFriends) {
      await remove(theirConnectionRef);
    }
}
