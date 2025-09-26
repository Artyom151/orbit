'use client';

import { PostCard } from "@/components/post-card";
import { useDatabase } from "@/firebase";
import { ref } from "firebase/database";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useList } from "@/firebase/rtdb/use-list";
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

export default function ExplorePage() {
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

    const isLoading = loadingPosts || loadingUsers;


  return (
    <div>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
        <h1 className="text-xl font-bold">Explore</h1>
      </div>
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
            <p className="text-center py-8 text-muted-foreground">Nothing to see here yet.</p>
            )
        }
        </div>
    </div>
  );
}
