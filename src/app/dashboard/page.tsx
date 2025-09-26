
'use client';

import { CreatePostForm } from "@/components/create-post-form";
import { PostCard } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatabase, useUser } from "@/firebase";
import { ref } from "firebase/database";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useList } from "@/firebase/rtdb/use-list";
import Link from "next/link";
import type { Post, User } from "@/lib/types";

const PostSkeleton = () => (
    <Card as="article" className="flex space-x-4 p-4 rounded-lg">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </Card>
);

export default function DashboardPage() {
  const { user: authUser } = useUser();
  const db = useDatabase();

  const postsQuery = useMemo(() => {
    if (!db) return null;
    return ref(db, "posts");
  }, [db]);

  const usersQuery = useMemo(() => {
    if(!db) return null;
    return ref(db, "users");
  }, [db]);

  const { data: postsData, loading: loadingPosts } = useList<Post>(postsQuery);
  const { data: usersData, loading: loadingUsers } = useList<User>(usersQuery);
  
  const postsWithUsers = useMemo(() => {
    if (!postsData || !usersData || postsData.length === 0 || usersData.length === 0) {
        return [];
    }

    const usersMap = new Map(usersData.map(u => [u.id, u]));

    return postsData
      .map(post => {
        const user = usersMap.get(post.userId);
        if (user) {
          return { ...post, user };
        }
        return null;
      })
      .filter((p): p is Post & { user: User } => p !== null)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [postsData, usersData]);

  const onlineUsers = useMemo(() => {
    if(usersData.length > 0) {
      // Show some users as "online"
      return usersData.slice(0, 5);
    }
    return [];
  }, [usersData]);

  const isLoading = loadingPosts || loadingUsers;

  return (
    <div>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
        <h1 className="text-xl font-bold">Home</h1>
      </div>
      <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-primary mb-2">{onlineUsers.length > 0 ? `${onlineUsers.length} online` : 'Welcome'}</p>
          <div className="flex items-center -space-x-2">
            {loadingUsers ? <p className="text-sm text-muted-foreground">Loading users...</p> : onlineUsers.map((user: User, index) => (
              <Link href={`/dashboard/profile/${user.username}`} key={user.id}>
                <Avatar className="h-12 w-12 border-2 border-background hover:scale-110 transition-transform duration-200" style={{ zIndex: onlineUsers.length - index }}>
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
            ))}
            { !loadingUsers && onlineUsers.length === 0 && <p className="text-sm text-muted-foreground">Say hello to the community!</p>}
          </div>
        </div>
      <CreatePostForm />
      <Tabs defaultValue="foryou" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-transparent border-b rounded-none">
          <TabsTrigger value="foryou" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">For You</TabsTrigger>
          <TabsTrigger value="following" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Following</TabsTrigger>
        </TabsList>
        <TabsContent value="foryou">
           <div className="space-y-4 p-4">
            {isLoading ? (
                <>
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                </>
            ) : 
              postsWithUsers.length > 0 ? (
                postsWithUsers.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))
              ) : (
                <p className="text-center py-8 text-muted-foreground">No posts yet. Be the first!</p>
              )
            }
          </div>
        </TabsContent>
         <TabsContent value="following">
           <div className="space-y-4 p-4">
            {isLoading ? (
                <>
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                </>
            ):
              postsWithUsers.filter((p) => p.userId !== authUser?.uid).map((post) => (
                <PostCard key={post.id} post={post} />
            ))}
             {!isLoading && postsWithUsers.filter((p) => p.userId !== authUser?.uid).length === 0 && <p className="text-center py-8 text-muted-foreground">Follow people to see their posts here.</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
