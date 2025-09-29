

'use client';

import { useDatabase, useUser } from "@/firebase";
import { useList } from "@/firebase/rtdb/use-list";
import type { Notification } from "@/lib/types";
import { ref, query, orderByChild, update } from "firebase/database";
import { useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, Repeat, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    switch (type) {
        case 'like':
            return <Heart className="size-5 text-red-500 fill-red-500" />;
        case 'comment':
            return <MessageCircle className="size-5 text-blue-500" />;
        case 'follow':
            return <UserPlus className="size-5 text-green-500" />;
        case 'repost':
            return <Repeat className="size-5 text-teal-500" />;
        default:
            return null;
    }
};

const NotificationText = ({ notification }: { notification: Notification }) => {
    const boldName = <span className="font-bold">{notification.senderName}</span>;
    switch (notification.type) {
        case 'like':
            return <>{boldName} liked your post.</>;
        case 'comment':
            return <>{boldName} commented on your post.</>;
        case 'follow':
            return <>{boldName} started following you.</>;
        case 'repost':
            return <>{boldName} reposted your post.</>;
        default:
            return 'New notification';
    }
};


export default function NotificationsPage() {
  const { user } = useUser();
  const db = useDatabase();

  const notificationsQuery = useMemo(() => {
    if (!user || !db) return null;
    return query(ref(db, `notifications/${user.uid}`), orderByChild('createdAt'));
  }, [user, db]);

  const { data: notifications, loading } = useList<Notification>(notificationsQuery);
  const sortedNotifications = useMemo(() => notifications.slice().reverse(), [notifications]);

  useEffect(() => {
    if (!user || !db || !notifications.length) return;
    
    // Mark all as read when the page is viewed
    const updates: Record<string, any> = {};
    notifications.forEach(notif => {
        if (!notif.read) {
            updates[`/notifications/${user.uid}/${notif.id}/read`] = true;
        }
    });

    if (Object.keys(updates).length > 0) {
        update(ref(db), updates);
    }
  }, [user, db, notifications]);

  return (
    <div>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
            <Loader2 className="animate-spin"/>
        </div>
      ) : sortedNotifications.length > 0 ? (
        <div className="divide-y divide-border">
            {sortedNotifications.map(notification => {
              const isVideoAvatar = notification.senderAvatar && notification.senderAvatar.startsWith('data:video');
              return (
                <Link 
                    href={notification.type === 'follow' ? `/dashboard/profile/${notification.senderUsername}` : `/dashboard/post/${notification.postId}`} 
                    key={notification.id}
                >
                    <div className="flex gap-4 p-4 hover:bg-secondary transition-colors">
                        <div className="relative">
                            <Avatar className="size-10">
                                {isVideoAvatar ? (
                                    <video src={notification.senderAvatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <AvatarImage src={notification.senderAvatar} />
                                )}
                                <AvatarFallback>{notification.senderName?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                                <NotificationIcon type={notification.type} />
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="leading-snug">
                                <NotificationText notification={notification} />
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                </Link>
            )})}
        </div>
      ) : (
         <div className="p-4 text-center">
            <p className="text-muted-foreground py-8">You have no new notifications.</p>
        </div>
      )}
      
    </div>
  );
}
