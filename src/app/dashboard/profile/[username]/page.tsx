
'use client';

import Image from "next/image";
import { PostCard } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, UserPlus, ArrowLeft, Edit, Shield, ShieldCheck, UserCheck, Clock, UserMinus } from "lucide-react";
import Link from "next/link";
import { useDatabase, useUser } from "@/firebase";
import React, { useMemo, useState, useEffect } from "react";
import { ref, query, orderByChild, equalTo } from "firebase/database";
import { useList } from "@/firebase/rtdb/use-list";
import { useObject } from "@/firebase/rtdb/use-object";
import { AnimatedBanner } from "@/components/animated-banner";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import type { User, Post as PostType, Connection } from "@/lib/types";
import { updateUserProfile } from "@/lib/auth-service";
import { useToast } from "@/hooks/use-toast";
import { acceptConnection, removeConnection, sendConnectionRequest } from "@/lib/connection-service";


export default function ProfilePage({ params }: { params: { username: string } }) {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const { toast } = useToast();
  const username = React.use(params).username;
  
  const userQuery = useMemo(() => {
    if (!db || !username) return null;
    return query(ref(db, 'users'), orderByChild('username'), equalTo(username));
  }, [db, username]);

  const { data: userData, loading: loadingUser } = useList<User>(userQuery);
  const user = userData?.[0];

  const userPostsQuery = useMemo(() => {
    if (!user || !db) return null;
    return query(ref(db, "posts"), orderByChild("userId"), equalTo(user.id));
  }, [db, user]);
  
  const { data: userPostsData, loading: loadingPosts } = useList<Omit<PostType, 'user'>>(userPostsQuery);
  
  // My connection to them
  const connectionRef = useMemo(() => {
    if (!authUser || !user || !db || authUser.uid === user.id) return null;
    return ref(db, `connections/${authUser.uid}/${user.id}`);
  }, [db, authUser, user]);
  const { data: connectionData } = useObject<Connection>(connectionRef);

  // Their connection to me
  const incomingConnectionRef = useMemo(() => {
    if (!authUser || !user || !db || authUser.uid === user.id) return null;
    return ref(db, `connections/${user.id}/${authUser.uid}`);
  }, [db, authUser, user]);
  const { data: incomingConnectionData } = useObject<Connection>(incomingConnectionRef);

  const connectionStatus = useMemo(() => {
    if (connectionData?.status === 'accepted') return 'connected';
    if (connectionData?.status === 'pending') return 'pending_outgoing';
    if (incomingConnectionData?.status === 'pending') return 'pending_incoming';
    return null;
  }, [connectionData, incomingConnectionData]);
  
  
  const sortedPosts = useMemo(() => {
    if (!userPostsData || !user) return [];
    const postsWithUser = userPostsData.map(post => ({...post, user}));
    return postsWithUser.sort((a, b) => b.createdAt - a.createdAt);
  }, [userPostsData, user]);

  const [gradient, setGradient] = useState<string[] | undefined>();

  useEffect(() => {
    if (user?.coverPhoto) {
      try {
        const parsedGradient = JSON.parse(user.coverPhoto);
        if (Array.isArray(parsedGradient) && parsedGradient.length === 2) {
          setGradient(parsedGradient);
        }
      } catch (e) {
        setGradient(undefined);
      }
    }
  }, [user?.coverPhoto]);
  
  const handleToggleModerator = async () => {
    if (!user) return;
    const newRole = user.role === 'moderator' ? 'user' : 'moderator';
    try {
        await updateUserProfile(user.id, { role: newRole });
        toast({
            title: 'Success',
            description: `${user.name} is now a ${newRole}.`,
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not update user role.',
        })
    }
  }

  const handleConnectionAction = async () => {
    if (!authUser || !user || !db) return;

    try {
        switch (connectionStatus) {
            case 'connected':
                await removeConnection(db, authUser.uid, user.id, true);
                toast({ title: "Connection removed" });
                break;
            case 'pending_outgoing':
                await removeConnection(db, authUser.uid, user.id, false);
                toast({ title: "Connection request cancelled" });
                break;
            case 'pending_incoming':
                await acceptConnection(db, authUser.uid, user.id);
                toast({ title: "Connection accepted!" });
                break;
            default:
                await sendConnectionRequest(db, authUser.uid, user.id);
                toast({ title: "Connection request sent!" });
                break;
        }
    } catch (error) {
        console.error("Connection action error:", error);
        toast({ variant: "destructive", title: "Something went wrong" });
    }
  };


  const renderConnectionButton = () => {
    if (!authUser || !user || authUser.uid === user.id) {
        return null;
    }

    switch (connectionStatus) {
        case 'connected':
            return (
                <Button variant="secondary" onClick={handleConnectionAction}>
                    <UserCheck className="mr-2 size-4" />
                    Connected
                </Button>
            );
        case 'pending_outgoing':
            return (
                <Button variant="secondary" onClick={handleConnectionAction}>
                    <Clock className="mr-2 size-4" />
                    Request Sent
                </Button>
            );
        case 'pending_incoming':
            return (
                <div className="flex gap-2">
                    <Button onClick={handleConnectionAction}>
                        <UserPlus className="mr-2 size-4" />
                        Accept
                    </Button>
                     <Button variant="secondary" onClick={() => removeConnection(db, user.id, authUser.uid, false).then(() => toast({title: "Request declined."}))}>
                        <UserMinus className="mr-2 size-4" />
                        Decline
                    </Button>
                </div>
            );
        default:
             return (
                 <Button onClick={handleConnectionAction}>
                    <UserPlus className="mr-2 size-4" />
                    Connect
                </Button>
            );
    }
  };


  if (loadingUser) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>Loading user profile...</p>
        </div>
    );
  }

  if (!user) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>User not found.</p>
        </div>
    )
  }
  
  const isOwnProfile = authUser?.uid === user.id;

  return (
    <div>
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-2 px-4 border-b border-border flex items-center gap-6">
            <Link href="/dashboard" className="lg:hidden">
                <Button variant="ghost" size="icon">
                    <ArrowLeft />
                </Button>
            </Link>
            <div className="animate-fade-in-down">
                <h1 className="text-xl font-bold">{user.name}</h1>
                <p className="text-sm text-muted-foreground">{loadingPosts ? '...' : sortedPosts.length} posts</p>
            </div>
        </div>

        <div className="relative h-36 md:h-48 w-full bg-secondary animate-fade-in">
          <AnimatedBanner color={gradient} />
        </div>
        
        <div className="p-4 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background -mt-16 md:-mt-20">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 pt-2 order-first sm:order-last self-end sm:self-auto">
                    {isOwnProfile ? (
                       <EditProfileDialog user={user}>
                        <Button variant="outline" className="transition-colors">
                            <Edit className="mr-2 size-4" />
                            Edit Profile
                        </Button>
                       </EditProfileDialog>
                    ) : (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                           {authUser?.role === 'developer' && user.role !== 'developer' && (
                                <Button variant="secondary" onClick={handleToggleModerator}>
                                    {user.role === 'moderator' ? <ShieldCheck className="mr-2 size-4"/> : <Shield className="mr-2 size-4"/>}
                                    {user.role === 'moderator' ? 'Unmake Moderator' : 'Make Moderator'}
                                </Button>
                            )}
                            {renderConnectionButton()}
                            <Button variant="outline" className="transition-colors">
                                <Mail className="mr-2 size-4" />
                                Message
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4">
                <div className="flex items-center">
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    {user.role === 'developer' && (
                        <span className="developer-badge">Developer</span>
                    )}
                    {user.role === 'moderator' && (
                        <span className="moderator-badge">Moderator</span>
                    )}
                </div>
                <p className="text-muted-foreground">@{user.username}</p>
                <p className="mt-4 max-w-2xl">{user.bio}</p>
            </div>
        </div>
      
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-transparent border-b rounded-none">
          <TabsTrigger value="posts" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Posts</TabsTrigger>
          <TabsTrigger value="replies" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Replies</TabsTrigger>
          <TabsTrigger value="media" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Media</TabsTrigger>
          <TabsTrigger value="likes" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Likes</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
           <div className="space-y-4 p-4">
            {loadingPosts ? <p className="text-center py-8 text-muted-foreground">Loading posts...</p> : 
             sortedPosts.length > 0 ? sortedPosts.map((post) => (
                <PostCard key={post.id} post={post as PostType & { user: User }} />
            )) : <p className="text-center text-muted-foreground">No posts yet.</p>}
          </div>
        </TabsContent>
         <TabsContent value="replies">
            <p className="text-center text-muted-foreground py-8">No replies yet.</p>
        </TabsContent>
        <TabsContent value="media">
             <p className="text-center text-muted-foreground py-8">No media yet.</p>
        </TabsContent>
        <TabsContent value="likes">
             <p className="text-center text-muted-foreground py-8">No liked posts yet.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
