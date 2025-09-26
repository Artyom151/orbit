
'use client';
import React, { useMemo, useState } from "react";
import { useDatabase, useUser } from "@/firebase";
import { useList } from "@/firebase/rtdb/use-list";
import { useObject } from "@/firebase/rtdb/use-object";
import type { Group, GroupMember, Post as PostType, User } from "@/lib/types";
import { ref, query, orderByChild, equalTo, runTransaction, remove, set } from "firebase/database";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, UserPlus, Edit } from "lucide-react";
import Link from "next/link";
import { CreatePostForm } from "@/components/create-post-form";
import { PostCard } from "@/components/post-card";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBanner } from "@/components/animated-banner";
import { EditGroupDialog } from "@/components/groups/edit-group-dialog";

export default function GroupPage({ params }: { params: { groupId: string } }) {
    const { groupId } = React.use(params);
    const { user: authUser } = useUser();
    const db = useDatabase();
    const { toast } = useToast();

    const groupRef = useMemo(() => {
        if (!db) return null;
        return ref(db, `groups/${groupId}`);
    }, [db, groupId]);
    const { data: group, loading: loadingGroup } = useObject<Group>(groupRef);
    
    const postsQuery = useMemo(() => {
        if (!db) return null;
        return query(ref(db, 'posts'), orderByChild('groupId'), equalTo(groupId));
    }, [db, groupId]);

    const usersQuery = useMemo(() => {
        if (!db) return null;
        return ref(db, "users");
    }, [db]);
    
    const { data: postsData, loading: loadingPosts } = useList<PostType>(postsQuery);
    const { data: usersData, loading: loadingUsers } = useList<User>(usersQuery);

    const membershipRef = useMemo(() => {
        if (!db || !authUser) return null;
        return ref(db, `groupMembers/${groupId}/${authUser.uid}`);
    }, [db, groupId, authUser]);

    const { data: membership } = useObject<GroupMember>(membershipRef);
    const isMember = !!membership;

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
            .filter((p): p is PostType & { user: User } => p !== null)
            .sort((a, b) => b.createdAt - a.createdAt);

    }, [postsData, usersData]);

    const handleToggleMembership = async () => {
        if (!db || !authUser || !group) return;

        const groupMembersRef = ref(db, `groupMembers/${group.id}/${authUser.uid}`);
        const groupDataRef = ref(db, `groups/${group.id}`);

        try {
            await runTransaction(groupDataRef, (currentData) => {
                if (currentData) {
                    if (isMember) {
                        currentData.memberCount = (currentData.memberCount || 1) - 1;
                    } else {
                        currentData.memberCount = (currentData.memberCount || 0) + 1;
                    }
                }
                return currentData;
            });

            if (isMember) {
                await remove(groupMembersRef);
                toast({ title: `You have left ${group.name}` });
            } else {
                await set(groupMembersRef, {
                    userId: authUser.uid,
                    groupId: group.id,
                    joinedAt: new Date().toISOString(),
                });
                toast({ title: `Welcome to ${group.name}!` });
            }
        } catch (error) {
            console.error("Error toggling membership:", error);
            toast({ variant: 'destructive', title: 'Something went wrong' });
        }
    };

    const isGradientBanner = group?.bannerUrl === 'default_gradient';

    return (
         <div>
            <div className="sticky top-16 lg:top-0 z-10 bg-background/80 backdrop-blur-sm p-2 px-4 border-b border-border flex items-center gap-6">
                <Link href="/dashboard/groups" className="lg:hidden">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft />
                    </Button>
                </Link>
                <div>
                    {loadingGroup ? (
                        <div className="h-6 w-32 bg-muted rounded-md animate-pulse" />
                    ) : (
                        <h1 className="text-xl font-bold">{group?.name}</h1>
                    )}
                </div>
            </div>
            
            {loadingGroup ? <div className="h-48 w-full bg-muted animate-pulse" /> : group && (
                 <div className="relative h-36 md:h-48 w-full bg-secondary">
                    {isGradientBanner ? (
                        <AnimatedBanner />
                    ) : (
                        <Image src={group.bannerUrl || 'https://picsum.photos/seed/group-default/800/200'} alt={group.name || ""} fill className="object-cover" />
                    )}
                </div>
            )}
           
           <div className="p-4 border-b">
                {loadingGroup ? (
                     <div className="space-y-2">
                        <div className="h-8 w-48 bg-muted rounded-md animate-pulse" />
                        <div className="h-4 w-full bg-muted rounded-md animate-pulse" />
                     </div>
                ): group && authUser && (
                    <>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                             <h2 className="text-2xl font-bold">{group.name}</h2>
                             <div className="flex-shrink-0">
                                {group.createdBy === authUser.uid ? (
                                    <EditGroupDialog group={group}>
                                        <Button variant="outline"><Edit className="mr-2"/>Edit Group</Button>
                                    </EditGroupDialog>
                                ) : (
                                    <Button onClick={handleToggleMembership} variant={isMember ? 'secondary' : 'default'}>
                                        {isMember ? <Check className="mr-2"/> : <UserPlus className="mr-2"/>}
                                        {isMember ? 'Joined' : 'Join Group'}
                                    </Button>
                                )}
                             </div>
                        </div>
                        <p className="text-muted-foreground mt-2">{group.description}</p>
                        <div className="flex items-center text-sm text-muted-foreground mt-2">
                            <UserPlus className="size-4 mr-2" />
                            <span>{group.memberCount || 0} members</span>
                        </div>
                    </>
                )}
           </div>

           {(isMember || (group && authUser && group.createdBy === authUser.uid)) && <CreatePostForm groupId={groupId} />}

           <div className="p-4 space-y-4">
                {(loadingPosts || loadingUsers) ? <p>Loading posts...</p> : postsWithUsers.length > 0 ? (
                    postsWithUsers.map(post => <PostCard key={post.id} post={post} />)
                ): (
                    <p className="text-center text-muted-foreground py-8">No posts in this group yet. Be the first!</p>
                )}
           </div>

        </div>
    )
}
