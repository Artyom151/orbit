

'use client';

import { CreatePostForm } from "@/components/create-post-form";
import { PostCard } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatabase, useUser } from "@/firebase";
import { ref, query, orderByChild, equalTo } from "firebase/database";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useList } from "@/firebase/rtdb/use-list";
import Link from "next/link";
import type { Post, User } from "@/lib/types";

type Status = {
  id: string;
  state: 'online' | 'offline';
  last_changed: number;
}

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
  
  const statusQuery = useMemo(() => {
    if(!db) return null;
    return query(ref(db, "status"), orderByChild('state'), equalTo('online'));
  }, [db]);


  const { data: postsData, loading: loadingPosts } = useList<Post>(postsQuery);
  const { data: usersData, loading: loadingUsers } = useList<User>(usersQuery);
  const { data: onlineStatuses, loading: loadingStatuses } = useList<Status>(statusQuery);
  
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
    if (!usersData.length || !onlineStatuses.length) {
      return [];
    }
    const onlineUserIds = new Set(onlineStatuses.map(s => s.id));
    return usersData.filter(user => onlineUserIds.has(user.id));
  }, [usersData, onlineStatuses]);

  const isLoading = loadingPosts || loadingUsers || loadingStatuses;

  return (
    <div>
      <div className="hidden lg:block sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
        <h1 className="text-xl font-bold">Home</h1>
      </div>
      
      <CreatePostForm />
      <Tabs defaultValue="foryou" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-transparent border-b rounded-none">
          <TabsTrigger value="foryou" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">For You</TabsTrigger>
          <TabsTrigger value="following" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent">Following</TabsTrigger>
        </TabsList>
        <TabsContent value="foryou">
           <div className="space-y-4">
            {isLoading ? (
                <div className="p-4 space-y-4">
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                </div>
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
           <div className="space-y-4">
            {isLoading ? (
                <div className="p-4 space-y-4">
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                </div>
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
