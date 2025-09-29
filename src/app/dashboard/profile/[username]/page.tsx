

'use client';

import Image from "next/image";
import { PostCard } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, UserPlus, ArrowLeft, Edit, Shield, ShieldCheck, UserCheck, Clock, UserMinus, Pin, Image as ImageIcon, MessageSquareText, Heart } from "lucide-react";
import Link from "next/link";
import { useDatabase, useUser } from "@/firebase";
import React, { useMemo, useState, useEffect } from "react";
import { ref, query, orderByChild, equalTo } from "firebase/database";
import { useList } from "@/firebase/rtdb/use-list";
import { useObject } from "@/firebase/rtdb/use-object";
import { AnimatedBanner } from "@/components/animated-banner";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import type { User, Post as PostType, Connection, Status } from "@/lib/types";
import { updateUserProfile } from "@/lib/auth-service";
import { useToast } from "@/hooks/use-toast";
import { acceptConnection, removeConnection, sendConnectionRequest } from "@/lib/connection-service";
import { cn } from "@/lib/utils";
import { ProfileSongPlayer } from "@/components/profile/profile-song-player";

const ProfileBackground = ({ src }: { src: string }) => {
    const isVideo = src.startsWith('data:video');
    return (
        <div className="absolute inset-0 w-full h-full -z-10">
            {isVideo ? (
                <video
                    src={src}
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover"
                />
            ) : (
                <Image
                    src={src}
                    alt="Profile background"
                    fill
                    className="object-cover"
                />
            )}
            <div className="absolute inset-0 bg-black/50" />
        </div>
    );
};


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
  const userFromQuery = userData?.[0];

  const isOwnProfile = authUser?.username === username;
  
  const user = useMemo(() => {
    if (userFromQuery) {
        return userFromQuery;
    }
    if (isOwnProfile && authUser) {
        return authUser as User;
    }
    return undefined;
  }, [isOwnProfile, authUser, userFromQuery]);


  const pinnedPostRef = useMemo(() => {
    if (!db || !user?.pinnedPostId) return null;
    return ref(db, `posts/${user.pinnedPostId}`);
  }, [db, user?.pinnedPostId]);

  const { data: pinnedPostData, loading: loadingPinnedPost } = useObject<Omit<PostType, 'user'>>(pinnedPostRef);
  const pinnedPost = pinnedPostData && user ? { ...pinnedPostData, user } : null;

  const userPostsQuery = useMemo(() => {
    if (!user?.id || !db) return null;
    return query(ref(db, "posts"), orderByChild("userId"), equalTo(user.id));
  }, [db, user?.id]);

  const userStatusQuery = useMemo(() => {
    if (!user || !db) return null;
    return ref(db, `status/${user.id}`);
  }, [db, user]);
  

  const { data: userPostsData, loading: loadingPosts } = useList<Omit<PostType, 'user'>>(userPostsQuery);
  const { data: userStatus } = useObject<Status>(userStatusQuery);
  
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
    return userPostsData
      .map(post => ({...post, user}))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [userPostsData, user]);

  const [gradient, setGradient] = useState<string[] | undefined>();
  const [videoBanner, setVideoBanner] = useState<string | undefined>();
  const [imageBanner, setImageBanner] = useState<string | undefined>();
  const [isGlassBanner, setIsGlassBanner] = useState<boolean>(false);

  useEffect(() => {
    if (user?.coverPhoto) {
        setGradient(undefined);
        setVideoBanner(undefined);
        setImageBanner(undefined);
        setIsGlassBanner(false);

        if (user.coverPhoto === 'glass') {
            setIsGlassBanner(true);
        } else if (user.coverPhoto.startsWith('data:video')) {
            setVideoBanner(user.coverPhoto);
        } else if (user.coverPhoto.startsWith('data:image')) {
            setImageBanner(user.coverPhoto);
        } else if (user.coverPhoto.startsWith('["#')) {
            try {
                const parsedGradient = JSON.parse(user.coverPhoto);
                if (Array.isArray(parsedGradient) && parsedGradient.length === 2) {
                    setGradient(parsedGradient);
                }
            } catch (e) { /* Ignore parsing error */ }
        } else if (user.coverPhoto.startsWith('http')) {
            setImageBanner(user.coverPhoto);
        }
    } else {
        setGradient(undefined);
        setVideoBanner(undefined);
        setImageBanner(undefined);
        setIsGlassBanner(false);
    }
  }, [user?.coverPhoto]);

  
  const handleToggleModerator = async () => {
    if (!user) return;
    const newRole = user.role === 'moderator' ? 'user' : 'developer';
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
    if (!authUser || !user || !db || !authUser.username) return;

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
                 await acceptConnection(db, authUser.uid, user.id, {
                    uid: authUser.uid,
                    displayName: authUser.displayName,
                    photoURL: authUser.photoURL,
                    username: authUser.username,
                });
                toast({ title: "Connection accepted!" });
                break;
            default:
                await sendConnectionRequest(db, authUser.uid, user.id);
                toast({ title: "Connection request sent!" });
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


  if (loadingUser || (isOwnProfile && !authUser)) {
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
  
  const isVideoAvatar = user.avatar && user.avatar.startsWith('data:video');

  const customThemeStyle: React.CSSProperties = {};
    if (typeof user.profileTheme === 'object' && user.profileTheme.name === 'custom') {
        customThemeStyle['--primary' as any] = user.profileTheme.colors.primary;
        customThemeStyle['--background' as any] = user.profileTheme.colors.background;
        customThemeStyle['--accent' as any] = user.profileTheme.colors.accent;
    }
    
    const customBorderStyle: React.CSSProperties = {};
    if (typeof user.storyBorder === 'object' && user.storyBorder !== null) {
        customBorderStyle.background = `linear-gradient(to bottom right, ${user.storyBorder.gradient[0]}, ${user.storyBorder.gradient[1]})`;
        if (user.storyBorder.glow) {
            customBorderStyle.boxShadow = `0 0 10px 1px ${user.storyBorder.glow}`;
        }
    }


  return (
    <div className={cn("relative", typeof user.profileTheme === 'string' ? user.profileTheme : '')} style={customThemeStyle}>
        {user.profileBackground && <ProfileBackground src={user.profileBackground} />}
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

        <div className="relative h-36 md:h-48 w-full bg-secondary/30 animate-fade-in">
          {isGlassBanner ? (
             <div className="h-full w-full bg-black/10 backdrop-blur-md border-b border-white/10"></div>
          ) : imageBanner ? (
             <Image src={imageBanner} alt={user.name || 'User banner'} fill className="object-cover" />
          ) : (
             <AnimatedBanner color={gradient} videoUrl={videoBanner} />
          )}
        </div>
        
        <div className="p-4 animate-fade-in-up bg-background/80 backdrop-blur-sm sm:rounded-t-lg">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                <div 
                    className={cn("relative z-10 -mt-16 md:-mt-20")}
                >
                    <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background">
                         {isVideoAvatar ? (
                           <video src={user.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                         ) : (
                           <AvatarImage src={user.avatar} alt={user.name} />
                         )}
                        <AvatarFallback>{user.name ? user.name.charAt(0) : '?'}</AvatarFallback>
                    </Avatar>
                </div>
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
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                     <div className={cn("w-3 h-3 rounded-full", userStatus?.state === 'online' ? 'bg-green-500' : 'bg-gray-400')} />
                    {user.role === 'developer' && (
                        <span className="developer-badge">Developer</span>
                    )}
                    {user.role === 'moderator' && (
                        <span className="moderator-badge">Moderator</span>
                    )}
                </div>
                <p className="text-muted-foreground">@{user.username}</p>
                {userStatus?.customStatus && (
                    <div className="mt-2 text-sm text-muted-foreground p-2 bg-secondary rounded-md inline-block">
                        {userStatus.customStatus}
                    </div>
                )}
                <p className="mt-4 max-w-2xl">{user.bio}</p>
                 {user.profileSong && (
                    <div className="mt-6 flex justify-center">
                        <ProfileSongPlayer track={user.profileSong} />
                    </div>
                 )}
            </div>
            
            {pinnedPost && !loadingPinnedPost && user && (
                <div className="my-6">
                    <PostCard post={pinnedPost as PostType & { user: User }} isPinned={true} />
                </div>
            )}
        </div>
      
      <Tabs defaultValue="posts" className="w-full bg-background/80 backdrop-blur-sm sm:rounded-b-lg">
        <TabsList className="grid w-full grid-cols-4 bg-transparent border-b rounded-none">
          <TabsTrigger value="posts">
              <MessageSquareText className="sm:mr-2" />
              <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger value="replies">
              <MessageSquareText className="sm:mr-2" />
               <span className="hidden sm:inline">Replies</span>
          </TabsTrigger>
          <TabsTrigger value="media">
              <ImageIcon className="sm:mr-2" />
               <span className="hidden sm:inline">Media</span>
          </TabsTrigger>
          <TabsTrigger value="likes">
              <Heart className="sm:mr-2" />
               <span className="hidden sm:inline">Likes</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
           <div className="space-y-4">
            {loadingPosts ? <p className="text-center py-8 text-muted-foreground">Loading posts...</p> : 
             sortedPosts.length > 0 ? sortedPosts.map((post) => {
                if (post.id === user.pinnedPostId) return null; // Don't show pinned post in the main feed
                return <PostCard key={post.id} post={post as PostType & { user: User }} />
            }) : <p className="text-center text-muted-foreground p-4">No posts yet.</p>}
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
