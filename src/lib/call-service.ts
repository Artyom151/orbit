
import { Database, ref, set, push, serverTimestamp, update, onValue, off, query, orderByChild, equalTo, get, limitToLast } from "firebase/database";
import type { User, Call } from "./types";
import { AppUser } from "@/firebase";

export const createCall = async (db: Database, caller: AppUser, receiver: User, type: 'audio' | 'video'): Promise<Call> => {
    const callsRef = ref(db, 'calls');
    const newCallRef = push(callsRef);

    const callData: Omit<Call, 'id'> = {
        caller: {
            id: caller.uid,
            name: caller.displayName || 'Unknown User',
            username: caller.username || 'unknown',
            avatar: caller.photoURL || ''
        } as User,
         receiver: {
            id: receiver.id,
            name: receiver.name,
            username: receiver.username,
            avatar: receiver.avatar
        } as User,
        type,
        status: 'ringing',
        createdAt: serverTimestamp(),
    };

    await set(newCallRef, callData);

    return { id: newCallRef.key!, ...callData };
};


export const updateCallStatus = async (db: Database, callId: string, status: Call['status']) => {
    const callRef = ref(db, `calls/${callId}`);
    await update(callRef, { status });
};

export const endCall = (db: Database, callId: string) => {
    return updateCallStatus(db, callId, 'ended');
}

export const acceptCall = (db: Database, callId: string) => {
    return updateCallStatus(db, callId, 'active');
}

export const declineCall = (db: Database, callId: string) => {
    return updateCallStatus(db, callId, 'declined');
}


export const listenForIncomingCall = (db: Database, userId: string, callback: (call: Call) => void): (() => void) => {
    const callsRef = query(
        ref(db, 'calls'), 
        orderByChild('receiver/id'), 
        equalTo(userId),
        limitToLast(1)
    );

    const listener = onValue(callsRef, async (snapshot) => {
        if (snapshot.exists()) {
            const calls = snapshot.val();
            const callId = Object.keys(calls)[0];
            const callData = calls[callId];
            
            if (callData.status === 'ringing') {
                 // To ensure we have the most up-to-date user data
                const callerSnap = await get(ref(db, `users/${callData.caller.id}`));
                const receiverSnap = await get(ref(db, `users/${callData.receiver.id}`));

                if (callerSnap.exists() && receiverSnap.exists()) {
                    const fullCallData: Call = {
                        id: callId,
                        ...callData,
                        caller: { id: callData.caller.id, ...callerSnap.val() },
                        receiver: { id: callData.receiver.id, ...receiverSnap.val() },
                    };
                    callback(fullCallData);
                }
            } else if (callData.status === 'ended' || callData.status === 'declined') {
                 callback({ id: callId, ...callData });
            }
        }
    });

    // Return the unsubscribe function
    return () => {
        off(callsRef, 'value', listener);
    };
};

    