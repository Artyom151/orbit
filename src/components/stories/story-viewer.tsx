

'use client';

import type { Story, User } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useDatabase } from "@/firebase";
import { useList } from "@/firebase/rtdb/use-list";
import { ref, query, orderByChild, startAt } from "firebase/database";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "../ui/progress";

type StoryViewerProps = {
    user: User;
    onClose: () => void;
};

const STORY_DURATION = 5000; // 5 seconds for images

export function StoryViewer({ user, onClose }: StoryViewerProps) {
    const [isOpen, setIsOpen] = useState(true);
    const db = useDatabase();
    
    const storiesQuery = useMemo(() => {
        if (!db || !user?.id) return null;
        return query(ref(db, `stories/${user.id}`), orderByChild('createdAt'));
    }, [db, user]);

    const { data: stories, loading } = useList<Story>(storiesQuery);
    
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    const activeStories = useMemo(() => {
        return stories.filter(s => s.expiresAt > Date.now());
    }, [stories]);

    const currentStory = activeStories?.[currentStoryIndex];

    useEffect(() => {
        if (!isOpen) {
            onClose();
        }
    }, [isOpen, onClose]);

     useEffect(() => {
        if (!currentStory) return;

        setProgress(0);
        let timer: NodeJS.Timeout;

        if (currentStory.mediaType === 'image') {
            timer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(timer);
                        goToNextStory();
                        return 100;
                    }
                    return prev + (100 / (STORY_DURATION / 100));
                });
            }, 100);
        }

        return () => {
            clearInterval(timer);
        };
    }, [currentStory, currentStoryIndex]);
    
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            const handleTimeUpdate = () => {
                if (video.duration) {
                    setProgress((video.currentTime / video.duration) * 100);
                }
            };
            const handleEnded = () => {
                goToNextStory();
            };
            
            video.addEventListener('timeupdate', handleTimeUpdate);
            video.addEventListener('ended', handleEnded);
            
            video.play().catch(e => console.error("Video play failed:", e));

            return () => {
                video.removeEventListener('timeupdate', handleTimeUpdate);
                video.removeEventListener('ended', handleEnded);
            }
        }
    }, [currentStory]);


    const goToNextStory = () => {
        if (currentStoryIndex < activeStories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
        } else {
            setIsOpen(false);
        }
    };

    const goToPrevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1);
        }
    };
    
    const isVideoAvatar = user.avatar && user.avatar.startsWith('data:video');

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md h-screen sm:h-[95vh] w-screen sm:w-full p-0 gap-0 bg-black border-0">
                <DialogHeader className="sr-only">
                    <DialogTitle>Story Viewer</DialogTitle>
                </DialogHeader>
                <div className="relative h-full w-full bg-black rounded-lg flex items-center justify-center overflow-hidden">
                    {loading && (
                        <div className="text-white">
                            <Loader2 className="animate-spin" />
                        </div>
                    )}

                    {!loading && !currentStory && (
                         <div className="text-white text-center">
                            <p>No active stories for this user.</p>
                         </div>
                    )}
                    
                    {currentStory && (
                        <>
                            {/* Media Display */}
                            {currentStory.mediaType === 'image' ? (
                                <Image src={currentStory.mediaUrl} alt={`Story by ${user.name}`} fill className="object-contain" />
                            ) : (
                                <video ref={videoRef} src={currentStory.mediaUrl} muted playsInline className="object-contain w-full h-full" />
                            )}
                            
                            {/* Overlay UI */}
                            <div className="absolute inset-0 flex flex-col">
                                {/* Progress Bars */}
                                <div className="flex gap-1 p-2">
                                    {activeStories.map((_, index) => (
                                        <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-white"
                                                style={{ width: `${index === currentStoryIndex ? progress : (index < currentStoryIndex ? 100 : 0)}%` }}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Header */}
                                <div className="flex items-center gap-3 p-2">
                                     <Avatar className="h-9 w-9 border-none">
                                        {isVideoAvatar ? (
                                            <video src={user.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <AvatarImage src={user.avatar} />
                                        )}
                                        <AvatarFallback>{user.name ? user.name.charAt(0) : '?'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <Link href={`/dashboard/profile/${user.username}`} className="font-bold text-white text-sm hover:underline">{user.name}</Link>
                                        <p className="text-xs text-white/70">{formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}</p>
                                    </div>
                                </div>
                                
                                <div className="flex-grow flex justify-between">
                                    <button className="w-1/3 h-full" onClick={goToPrevStory} aria-label="Previous Story" />
                                    <button className="w-1/3 h-full" onClick={goToNextStory} aria-label="Next Story" />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
