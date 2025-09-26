
'use client';

import Image from "next/image";
import { PostCard } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, UserPlus, ArrowLeft, Edit, Heart, Shield, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useDatabase, useUser } from "@/firebase";
import { useMemo, useState, useEffect } from "react";
import { ref, query, orderByChild, equalTo } from "firebase/database";
import { useList } from "@/firebase/rtdb/use-list";
import { AnimatedBanner } from "@/components/animated-banner";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import type { FavoriteTrack, User } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { updateUserProfile } from "@/lib/auth-service";
import { useToast } from "@/hooks/use-toast";

type PostDoc = {
  id: string;
  userId: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  createdAt: any;
  user: User;
}

const FavoriteTrackItem = ({ track }: { track: FavoriteTrack }) => (
    <Card className="p-2 flex items-center gap-4 rounded-lg">
        <Image src={track.artworkUrl100} alt={track.trackName} width={48} height={48} className="rounded" unoptimized />
        <div className="flex-1">
            <p className="font-bold truncate text-sm">{track.trackName}</p>
            <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
        </div>
    </Card>
);

export default function ProfilePage({ params }: { params: { username: string } }) {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const { toast } = useToast();
  
  const userQuery = useMemo(() => {
    if (!db || !params.username) return null;
    return query(ref(db, 'users'), orderByChild('username'), equalTo(params.username));
  }, [db, params.username]);

  const { data: userData, loading: loadingUser } = useList<User>(userQuery);
  const user = userData?.[0];

  const userPostsQuery = useMemo(() => {
    if (!user || !db) return null;
    return query(ref(db, "posts"), orderByChild("userId"), equalTo(user.id));
  }, [db, user]);
  
  const { data: userPostsData, loading: loadingPosts } = useList<Omit<PostDoc, 'user'>>(userPostsQuery);

  const favoriteTracksQuery = useMemo(() => {
    if (!user || !db) return null;
    return query(ref(db, `favoriteTracks/${user.id}`), orderByChild('favoritedAt'));
  }, [db, user]);

  const { data: favoriteTracks, loading: loadingFavorites } = useList<FavoriteTrack>(favoriteTracksQuery);
  
  const sortedPosts = useMemo(() => {
    if (!userPostsData || !user) return [];
    return userPostsData
        .map(post => ({...post, user}))
        .sort((a,b) => b.createdAt - a.createdAt);
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
        // Not a gradient, might be a URL, ignore for now.
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
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background -mt-16">
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
                        <>
                           {authUser?.role === 'developer' && user.role !== 'developer' && (
                                <Button variant="secondary" onClick={handleToggleModerator}>
                                    {user.role === 'moderator' ? <ShieldCheck className="mr-2 size-4"/> : <Shield className="mr-2 size-4"/>}
                                    {user.role === 'moderator' ? 'Unmake Moderator' : 'Make Moderator'}
                                </Button>
                            )}
                            <Button className="transition-colors">
                                <UserPlus className="mr-2 size-4" />
                                Connect
                            </Button>
                            <Button variant="outline" className="transition-colors">
                                <Mail className="mr-2 size-4" />
                                Message
                            </Button>
                        </>
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
                <p className="text-muted-foreground">@{params.username}</p>
                <p className="mt-4 max-w-2xl">{user.bio}</p>
            </div>
        </div>
      
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-transparent border-b rounded-none">
          <TabsTrigger value="posts" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Posts</TabsTrigger>
          <TabsTrigger value="replies" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Replies</TabsTrigger>
          <TabsTrigger value="media" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Media</TabsTrigger>
          <TabsTrigger value="likes" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Likes</TabsTrigger>
          <TabsTrigger value="music" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Music</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
           <div className="space-y-4 p-4">
            {loadingPosts ? <p className="text-center py-8 text-muted-foreground">Loading posts...</p> : 
             sortedPosts.length > 0 ? sortedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
            )) : <p className="text-center text-muted-foreground py-8">No posts yet.</p>}
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
        <TabsContent value="music">
           <div className="space-y-2 p-4">
            {loadingFavorites ? <p className="text-center py-8 text-muted-foreground">Loading favorite tracks...</p> :
              favoriteTracks.length > 0 ? [...favoriteTracks].reverse().map((track) => (
                <FavoriteTrackItem key={track.id} track={track} />
              )) : <p className="text-center text-muted-foreground py-8">No favorite tracks yet.</p>}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
