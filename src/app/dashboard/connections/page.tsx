

'use client';

import { useDatabase, useUser } from "@/firebase";
import { useList } from "@/firebase/rtdb/use-list";
import type { Connection, User } from "@/lib/types";
import { ref } from "firebase/database";
import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { acceptConnection, removeConnection } from "@/lib/connection-service";
import { useToast } from "@/hooks/use-toast";


const UserCard = ({ user, children }: { user: User, children?: React.ReactNode }) => {
    const isVideoAvatar = user.avatar && user.avatar.startsWith('data:video');
    return (
    <Card className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
                {isVideoAvatar ? (
                    <video src={user.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                ) : (
                    <AvatarImage src={user.avatar} />
                )}
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <Link href={`/dashboard/profile/${user.username}`} className="font-bold hover:underline">{user.name}</Link>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
        </div>
        <div className="flex gap-2">
            {children}
        </div>
    </Card>
)}

export default function ConnectionsPage() {
    const { user: authUser } = useUser();
    const db = useDatabase();
    const { toast } = useToast();

    // All connections where the current user is the target
    const incomingConnectionsQuery = useMemo(() => {
        if (!authUser || !db) return null;
        return ref(db, `connections`);
    }, [authUser, db]);

    // Our own connections list (outgoing requests and accepted friends)
    const myConnectionsQuery = useMemo(() => {
        if (!authUser || !db) return null;
        return ref(db, `connections/${authUser.uid}`);
    }, [authUser, db]);

    // All users
    const usersQuery = useMemo(() => {
        if (!db) return null;
        return ref(db, 'users');
    }, [db]);

    const { data: allUsersConnections } = useList<any>(incomingConnectionsQuery);
    const { data: myConnections, loading: loadingMyConnections } = useList<Connection>(myConnectionsQuery);
    const { data: users, loading: loadingUsers } = useList<User>(usersQuery);

    const { friends, pendingIncoming, pendingOutgoing } = useMemo(() => {
        if (!myConnections || !users || !authUser || !allUsersConnections) {
            return { friends: [], pendingIncoming: [], pendingOutgoing: [] };
        }
        
        const usersMap = new Map(users.map(u => [u.id, u]));

        const friends: User[] = [];
        const pendingOutgoing: User[] = [];
        const pendingIncoming: User[] = [];
        
        // Populate friends and outgoing requests from our own connection list
        myConnections.forEach(conn => {
            const friend = usersMap.get(conn.id);
            if (friend) {
                if (conn.status === 'accepted') {
                    friends.push(friend);
                } else if (conn.status === 'pending') {
                    pendingOutgoing.push(friend);
                }
            }
        });

        // Find incoming requests by checking who has a pending request to us
        allUsersConnections.forEach(userConnections => {
            if (userConnections.id === authUser.uid) return; // Skip our own list

            const theirConnections = userConnections as unknown as Record<string, { status: string }>;
            const requestToMe = theirConnections[authUser.uid];

            if (requestToMe && requestToMe.status === 'pending') {
                 // Check if we already have a connection with them (i.e. we are friends)
                const alreadyFriends = friends.some(f => f.id === userConnections.id);
                if (!alreadyFriends) {
                    const requester = usersMap.get(userConnections.id);
                    if (requester) {
                        pendingIncoming.push(requester);
                    }
                }
            }
        })


        return { friends, pendingIncoming, pendingOutgoing };

    }, [myConnections, users, authUser, allUsersConnections]);

     const handleAccept = async (userId: string) => {
        if (!authUser || !db) return;
        try {
            await acceptConnection(db, authUser.uid, userId);
            toast({ title: "Connection accepted!" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Something went wrong" });
        }
    };

    const handleDecline = async (userId: string) => {
        if (!authUser || !db) return;
        try {
            // To decline, we remove their pending request to us
            const theirConnectionRef = ref(db, `connections/${userId}/${authUser.uid}`);
            await remove(theirConnectionRef);
            toast({ title: "Connection declined" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Something went wrong" });
        }
    };
    
    const handleCancelRequest = async (userId: string) => {
        if (!authUser || !db) return;
        try {
            await removeConnection(db, authUser.uid, userId, false);
            toast({ title: "Connection request cancelled" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Something went wrong" });
        }
    }

     const handleRemoveFriend = async (userId: string) => {
        if (!authUser || !db) return;
        try {
            await removeConnection(db, authUser.uid, userId, true);
            toast({ title: "Connection removed" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Something went wrong" });
        }
    };


    const isLoading = loadingMyConnections || loadingUsers;

    return (
        <div>
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
                <h1 className="text-xl font-bold">Connections</h1>
            </div>
            
            <Tabs defaultValue="friends" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-transparent border-b rounded-none">
                    <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
                    <TabsTrigger value="requests">Requests ({pendingIncoming.length})</TabsTrigger>
                    <TabsTrigger value="sent">Sent ({pendingOutgoing.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="friends" className="p-4 space-y-4">
                    {isLoading ? <p>Loading...</p> : friends.length > 0 ? (
                        friends.map(friend => (
                            <UserCard key={friend.id} user={friend}>
                                <Button variant="secondary" onClick={() => handleRemoveFriend(friend.id)}>Remove</Button>
                            </UserCard>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">You have no connections yet.</p>
                    )}
                </TabsContent>

                <TabsContent value="requests" className="p-4 space-y-4">
                    {isLoading ? <p>Loading...</p> : pendingIncoming.length > 0 ? (
                         pendingIncoming.map(user => (
                            <UserCard key={user.id} user={user}>
                                <Button onClick={() => handleAccept(user.id)}>Accept</Button>
                                <Button variant="secondary" onClick={() => handleDecline(user.id)}>Decline</Button>
                            </UserCard>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No new connection requests.</p>
                    )}
                </TabsContent>
                 <TabsContent value="sent" className="p-4 space-y-4">
                    {isLoading ? <p>Loading...</p> : pendingOutgoing.length > 0 ? (
                         pendingOutgoing.map(user => (
                            <UserCard key={user.id} user={user}>
                                <Button variant="secondary" onClick={() => handleCancelRequest(user.id)}>Cancel Request</Button>
                            </UserCard>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">You have no outgoing requests.</p>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
