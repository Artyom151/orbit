
'use client';

import { PostCard } from "@/components/post-card";
import { useDatabase, useUser } from "@/firebase";
import { ref, query, orderByChild } from "firebase/database";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useList } from "@/firebase/rtdb/use-list";
import type { Post, User, Bookmark } from "@/lib/types";

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

export default function BookmarksPage() {
    const { user: authUser } = useUser();
    const db = useDatabase();

    const bookmarksQuery = useMemo(() => {
        if (!authUser || !db) return null;
        return query(ref(db, `bookmarks/${authUser.uid}`), orderByChild("bookmarkedAt"));
    }, [authUser, db]);

    const { data: bookmarks, loading: loadingBookmarks } = useList<Bookmark>(bookmarksQuery);
    
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

    const bookmarkedPosts = useMemo(() => {
        if (!bookmarks.length || !postsData.length || !usersData.length) {
            return [];
        }

        const bookmarkedPostIds = new Set(bookmarks.map(b => b.postId));
        const usersMap = new Map(usersData.map(u => [u.id, u]));

        return postsData
            .filter(post => bookmarkedPostIds.has(post.id))
            .map(post => {
                const user = usersMap.get(post.userId);
                if (user) {
                    return { ...post, user };
                }
                return null;
            })
            .filter((p): p is Post & { user: User } => p !== null)
            .sort((a, b) => {
                const bookmarkA = bookmarks.find(bm => bm.postId === a.id);
                const bookmarkB = bookmarks.find(bm => bm.postId === b.id);
                return (bookmarkB?.bookmarkedAt || 0) - (bookmarkA?.bookmarkedAt || 0);
            });
            
    }, [bookmarks, postsData, usersData]);

    const isLoading = loadingBookmarks || loadingPosts || loadingUsers;

    return (
        <div>
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
                <h1 className="text-xl font-bold">Bookmarks</h1>
                {authUser && <p className="text-sm text-muted-foreground">@{authUser.username}</p>}
            </div>
             <div className="space-y-4 p-4">
                {isLoading ? (
                    <>
                        <PostSkeleton />
                        <PostSkeleton />
                        <PostSkeleton />
                    </>
                ) : bookmarkedPosts.length > 0 ? (
                    bookmarkedPosts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))
                ) : (
                    <div className="p-4">
                        <p className="text-center text-muted-foreground py-8">You have no saved bookmarks.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
