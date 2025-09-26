'use client';
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import Link from "next/link";
import { useDatabase, useUser } from "@/firebase";
import { ref, query, limitToFirst } from "firebase/database";
import { useMemo } from "react";
import { useList } from "@/firebase/rtdb/use-list";
import type { User, Post } from "@/lib/types";

const TrendingTopic = ({ topic, category, postCount }: { topic: string; category: string; postCount: string }) => (
    <div>
        <p className="text-sm text-muted-foreground">{category}</p>
        <p className="font-bold">{topic}</p>
        <p className="text-sm text-muted-foreground">{postCount} posts</p>
    </div>
);


export function RightSidebar() {
    const { user: authUser } = useUser();
    const db = useDatabase();

    const usersQuery = useMemo(() => {
        if (!db) return null;
        return query(ref(db, "users"), limitToFirst(4));
    }, [db]);
    
    const postsQuery = useMemo(() => {
        if (!db) return null;
        return ref(db, "posts");
    }, [db]);

    const { data: usersToFollow, loading: loadingUsers } = useList<User>(usersQuery);
    const { data: posts, loading: loadingPosts } = useList<Post>(postsQuery);
    
    const filteredUsers = useMemo(() => {
        if (!usersToFollow) return [];
        return usersToFollow.filter(u => u.id !== authUser?.uid).slice(0, 3);
    }, [usersToFollow, authUser]);

    const trendingTopics = useMemo(() => {
        if (!posts) return [];

        const hashtagCounts: Record<string, number> = {};
        
        posts.forEach(post => {
            const hashtags = post.content.match(/#\w+/g) || [];
            hashtags.forEach(hashtag => {
                const lowerCaseHashtag = hashtag.toLowerCase();
                hashtagCounts[lowerCaseHashtag] = (hashtagCounts[lowerCaseHashtag] || 0) + 1;
            });
        });

        return Object.entries(hashtagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([topic, count]) => ({
                topic: topic.replace(/#/g, ""),
                postCount: `${(count / 1000).toFixed(1)}k`,
            }));

    }, [posts]);

  return (
    <aside className="w-96 p-4 space-y-6">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search" className="rounded-full pl-10 bg-secondary border-none h-12" />
        </div>

        <Card className="rounded-2xl animate-fade-in">
            <CardHeader>
                <CardTitle className="text-xl">What's happening</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {loadingPosts ? <p>Loading trends...</p> : 
                 trendingTopics.length > 0 ? (
                    trendingTopics.map((trend, index) => (
                        <TrendingTopic key={index} topic={`#${trend.topic}`} category="Trending" postCount={`${trend.postCount}`} />
                    ))
                 ) : (
                    <p className="text-sm text-muted-foreground">No trends right now. Start posting with hashtags!</p>
                 )
                }
            </CardContent>
        </Card>

        <Card className="rounded-2xl animate-fade-in">
            <CardHeader>
                <CardTitle className="text-xl">Who to follow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {loadingUsers ? <p>Loading...</p> : filteredUsers.map((user: User) => (
                   <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-none">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <Link href={`/dashboard/profile/${user.username}`} className="font-bold hover:underline">{user.name}</Link>
                                <p className="text-sm text-muted-foreground">@{user.username}</p>
                            </div>
                        </div>
                       <Button className="rounded-full bg-white text-black font-bold hover:bg-white/90">Follow</Button>
                   </div>
               ))}
            </CardContent>
        </Card>
    </aside>
  );
}
