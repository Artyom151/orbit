
'use client';

import { PostCard } from "@/components/post-card";
import { useDatabase } from "@/firebase";
import { ref, query, orderByChild } from "firebase/database";
import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useList } from "@/firebase/rtdb/use-list";
import type { Post, User, Group } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Users, Newspaper } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { AnimatedBanner } from "@/components/animated-banner";

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

const UserCard = ({ user }: { user: User }) => (
    <Card className="p-4">
        <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <Link href={`/dashboard/profile/${user.username}`} className="font-bold hover:underline">{user.name}</Link>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
        </div>
    </Card>
);

const GroupCard = ({ group }: { group: Group }) => {
    const isGradientBanner = group.bannerUrl === 'default_gradient';
    return (
        <Link href={`/dashboard/groups/${group.id}`} key={group.id}>
            <Card className="hover:bg-secondary transition-colors">
                <div className="relative h-24 w-full">
                    {isGradientBanner ? (
                        <AnimatedBanner />
                    ) : (
                        <Image src={group.bannerUrl || 'https://picsum.photos/seed/group-default/800/200'} alt={group.name} fill className="object-cover rounded-t-lg" />
                    )}
                </div>
                <div className="p-4">
                    <h2 className="font-bold text-lg">{group.name}</h2>
                    <div className="flex items-center text-sm text-muted-foreground mt-2">
                        <Users className="size-4 mr-2" />
                        <span>{group.memberCount || 0} members</span>
                    </div>
                </div>
            </Card>
        </Link>
    )
};


export default function ExplorePage() {
    const db = useDatabase();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const postsQuery = useMemo(() => {
        if (!db) return null;
        return query(ref(db, "posts"), orderByChild('createdAt'));
    }, [db]);

    const usersQuery = useMemo(() => {
        if(!db) return null;
        return query(ref(db, "users"));
    }, [db]);
    
    const groupsQuery = useMemo(() => {
        if (!db) return null;
        return ref(db, "groups");
    }, [db]);

    const { data: postsData, loading: loadingPosts } = useList<Post>(postsQuery);
    const { data: usersData, loading: loadingUsers } = useList<User>(usersQuery);
    const { data: groupsData, loading: loadingGroups } = useList<Group>(groupsQuery);
    
    const postsWithUsers = useMemo(() => {
        if (!postsData || !usersData || postsData.length === 0 || usersData.length === 0) {
            return [];
        }
        const usersMap = new Map(usersData.map(u => [u.id, u]));
        return postsData
            .map(post => {
                const user = usersMap.get(post.userId);
                if (user) return { ...post, user };
                return null;
            })
            .filter((p): p is Post & { user: User } => p !== null)
            .reverse();
    }, [postsData, usersData]);
    
    const trendingTopics = useMemo(() => {
        if (!postsData) return [];
        const hashtagCounts: Record<string, number> = {};
        postsData.forEach(post => {
            const content = post.content || '';
            const hashtags = content.match(/#\w+/g) || [];
            hashtags.forEach(hashtag => {
                const lowerCaseHashtag = hashtag.toLowerCase();
                hashtagCounts[lowerCaseHashtag] = (hashtagCounts[lowerCaseHashtag] || 0) + 1;
            });
        });
        return Object.entries(hashtagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([topic, count]) => ({ topic, count }));
    }, [postsData]);

    const filteredPosts = useMemo(() => {
        if (!debouncedSearchTerm) return postsWithUsers;
        return postsWithUsers.filter(p => (p.content || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    }, [debouncedSearchTerm, postsWithUsers]);

    const filteredUsers = useMemo(() => {
        if (!debouncedSearchTerm) return usersData;
        const lowercasedTerm = debouncedSearchTerm.toLowerCase();
        return usersData.filter(u => u.name.toLowerCase().includes(lowercasedTerm) || u.username.toLowerCase().includes(lowercasedTerm));
    }, [debouncedSearchTerm, usersData]);
    
    const filteredGroups = useMemo(() => {
        if (!debouncedSearchTerm) return groupsData;
        return groupsData.filter(g => g.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    }, [debouncedSearchTerm, groupsData]);

    const isLoading = loadingPosts || loadingUsers || loadingGroups;

  return (
    <div>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
                placeholder="Search Orbit..." 
                className="rounded-full pl-10 bg-secondary border-none h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
        </div>
      </div>
      <Tabs defaultValue="foryou" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-transparent border-b rounded-none">
          <TabsTrigger value="foryou">For You</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>
        <TabsContent value="foryou" className="p-4 space-y-4">
            {isLoading ? (
                <>
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                </>
            ) : filteredPosts.length > 0 ? (
                filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
                <p className="text-center py-8 text-muted-foreground">No posts found for "{debouncedSearchTerm}".</p>
            )}
        </TabsContent>
         <TabsContent value="trending" className="p-4 space-y-2">
            {isLoading ? <p>Loading trends...</p> : trendingTopics.length > 0 ? (
                trendingTopics.map(trend => (
                    <Card key={trend.topic} className="p-4 hover:bg-secondary">
                        <p className="font-bold text-lg">{trend.topic}</p>
                        <p className="text-sm text-muted-foreground">{trend.count} posts</p>
                    </Card>
                ))
            ) : (
                <p className="text-center py-8 text-muted-foreground">No trending topics right now.</p>
            )}
        </TabsContent>
         <TabsContent value="users" className="p-4 space-y-4">
            {isLoading ? <p>Loading users...</p> : filteredUsers.length > 0 ? (
                filteredUsers.map(user => <UserCard key={user.id} user={user} />)
            ): (
                 <p className="text-center py-8 text-muted-foreground">No users found.</p>
            )}
        </TabsContent>
        <TabsContent value="groups" className="p-4 grid gap-4 md:grid-cols-2">
             {isLoading ? <p>Loading groups...</p> : filteredGroups.length > 0 ? (
                filteredGroups.map(group => <GroupCard key={group.id} group={group} />)
            ): (
                 <p className="text-center py-8 text-muted-foreground col-span-2">No groups found.</p>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

    