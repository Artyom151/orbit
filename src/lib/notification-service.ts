
import { Database, ref, set, push, serverTimestamp } from "firebase/database";
import type { Notification } from "./types";

type CreateNotificationPayload = Omit<Notification, 'id' | 'createdAt' | 'read'>;

export const createNotification = async (db: Database, payload: CreateNotificationPayload): Promise<void> => {
    const notificationRef = push(ref(db, `notifications/${payload.recipientId}`));
    
    const notificationData: Omit<Notification, 'id'> = {
        ...payload,
        createdAt: serverTimestamp() as any,
        read: false,
    };

    await set(notificationRef, notificationData);
};
