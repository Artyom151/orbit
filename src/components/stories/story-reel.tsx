
'use client';

import { useDatabase, useUser } from "@/firebase";
import type { Story, User } from "@/lib/types";
import { ref, get, onValue, query, orderByChild, startAt } from "firebase/database";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Plus } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { StoryViewer } from "./story-viewer";
import { CreateStoryDialog } from "./create-story-dialog";
import { cn } from "@/lib/utils";

const StoryAvatar = ({ user, hasStory, isOwn, onClick }: { user: User, hasStory: boolean, isOwn?: boolean, onClick?: () => void }) => {
    if (!user || !user.name) {
        return <Skeleton className="h-24 w-16 rounded-full" />;
    }

    const isVideoAvatar = user.avatar && user.avatar.startsWith('data:video');
    const customBorderStyle: React.CSSProperties = {};
    if (hasStory && typeof user.storyBorder === 'object' && user.storyBorder !== null) {
        customBorderStyle.background = `linear-gradient(to bottom right, ${user.storyBorder.gradient[0]}, ${user.storyBorder.gradient[1]})`;
        if (user.storyBorder.glow) {
        customBorderStyle.boxShadow = `0 0 10px 1px ${user.storyBorder.glow}`;
        }
    } else if (hasStory) {
        switch(user.storyBorder) {
            case 'rainbow':
                 customBorderStyle.background = 'linear-gradient(to bottom right, red, orange, yellow, green, blue, indigo, violet)';
                 break;
            case 'gold':
                customBorderStyle.background = 'linear-gradient(to bottom right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)';
                break;
            case 'neon':
                customBorderStyle.background = '#00FFFF';
                customBorderStyle.boxShadow = '0 0 10px 1px #00FFFF';
                break;
            default:
                 customBorderStyle.background = 'linear-gradient(to top right, #f9ce34, #ee2a7b, #6228d7)';
        }
    }


    return (
        <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={onClick}>
            <div className="relative">
                 <Avatar className="h-16 w-16 border-2 border-background">
                    {isVideoAvatar ? (
                        <video src={user.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                    ) : (
                        <AvatarImage src={user.avatar} />
                    )}
                    <AvatarFallback>{user.name ? user.name.charAt(0) : '?'}</AvatarFallback>
                </Avatar>

                {isOwn && !hasStory && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center border-2 border-background">
                        <Plus className="size-4" />
                    </div>
                )}
                 {(hasStory) && (
                     <div 
                        className={cn("absolute inset-[-3px] rounded-full -z-10", hasStory && "animate-gradient-animation")}
                        style={customBorderStyle}
                      />
                 )}
            </div>
            <p className="text-xs font-medium truncate w-16 text-center">{isOwn ? "Your Story" : user.name}</p>
        </div>
    );
};


export function StoryReel() {
    const { user: authUser } = useUser();
    const db = useDatabase();
    
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    const [otherUsersWithStories, setOtherUsersWithStories] = useState<User[]>([]);
    const [authUserHasStory, setAuthUserHasStory] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;

        const allStoriesRef = query(ref(db, 'stories'), orderByChild('expiresAt'), startAt(Date.now()));
        
        const unsubscribe = onValue(allStoriesRef, async (snapshot) => {
            setLoading(true);
            const activeStoriesData = snapshot.val();
            
            if (!activeStoriesData) {
                setOtherUsersWithStories([]);
                setAuthUserHasStory(false);
                setLoading(false);
                return;
            }

            const userIdsWithStories = Object.keys(activeStoriesData);
            
            if (authUser) {
                setAuthUserHasStory(userIdsWithStories.includes(authUser.uid));
            }

            const otherUserIds = userIdsWithStories.filter(id => id !== authUser?.uid);

            if (otherUserIds.length > 0) {
                const userPromises = otherUserIds.map(id => get(ref(db, `users/${id}`)));
                const userSnapshots = await Promise.all(userPromises);
                const fetchedUsers = userSnapshots
                    .map(snap => snap.exists() ? ({ id: snap.key, ...snap.val() } as User) : null)
                    .filter((u): u is User => u !== null);
                setOtherUsersWithStories(fetchedUsers);
            } else {
                setOtherUsersWithStories([]);
            }

            setLoading(false);
        });

        return () => unsubscribe();
        
    }, [db, authUser]);


    const handleAuthUserStoryClick = () => {
        if (!authUser) return;
        if (authUserHasStory) {
            setSelectedUser(authUser as User);
        } else {
            setIsCreateOpen(true);
        }
    };
    
    const handleOtherUserStoryClick = (user: User) => {
        setSelectedUser(user);
    };

    return (
        <div className="relative">
             {selectedUser && (
                <StoryViewer user={selectedUser} onClose={() => setSelectedUser(null)} />
             )}
             <CreateStoryDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
             <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                {loading && !authUser ? (
                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-16 rounded-full" />)
                ) : (
                   <>
                    {authUser && (
                         <StoryAvatar 
                            user={authUser as User}
                            hasStory={authUserHasStory}
                            isOwn={true}
                            onClick={handleAuthUserStoryClick}
                        />
                    )}
                    {loading && otherUsersWithStories.length === 0 && authUser ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-16 rounded-full" />)
                    ) : (
                        otherUsersWithStories.map(user => (
                            <StoryAvatar 
                                key={user.id}
                                user={user}
                                hasStory={true}
                                onClick={() => handleOtherUserStoryClick(user)}
                            />
                        ))
                    )}
                   </>
                )}
            </div>
        </div>
    );
}
