

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDatabase, useUser } from "@/firebase";
import { ref, push, set, serverTimestamp, update, remove } from "firebase/database";
import { formatDistanceToNow } from "date-fns";
import React, { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Post, Comment, User, Notification } from "@/lib/types";
import { useList } from "@/firebase/rtdb/use-list";
import { Card } from "./ui/card";
import Link from "next/link";
import { Skeleton } from "./ui/skeleton";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createNotification } from "@/lib/notification-service";

type CommentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    post: Post & { user: User };
};

const CommentSkeleton = () => (
    <div className="flex space-x-4 p-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    </div>
);

export function CommentDialog({ open, onOpenChange, post }: CommentDialogProps) {
    const { user: authUser } = useUser();
    const db = useDatabase();
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const commentsQuery = useMemo(() => {
        if (!db || !post) return null;
        return ref(db, `comments/${post.id}`);
    }, [db, post]);

    const usersQuery = useMemo(() => {
        if(!db) return null;
        return ref(db, "users");
      }, [db]);

    const { data: commentsData, loading: loadingComments } = useList<Omit<Comment, 'user'>>(commentsQuery);
    const { data: usersData, loading: loadingUsers } = useList<User>(usersQuery);

    const commentsWithUsers = useMemo(() => {
        if (!commentsData || !usersData) return [];
        const usersMap = new Map(usersData.map(u => [u.id, u]));
        return commentsData.map(comment => ({
            ...comment,
            user: usersMap.get(comment.userId) as User | undefined
        })).sort((a,b) => a.createdAt - b.createdAt);
    }, [commentsData, usersData]);


    const handleComment = async () => {
        if (!content.trim() || !authUser || !db) return;

        setIsSubmitting(true);
        try {
            const commentRef = ref(db, `comments/${post.id}/${push(ref(db, `comments/${post.id}`)).key}`);
            await set(commentRef, {
                userId: authUser.uid,
                postId: post.id,
                content: content,
                createdAt: serverTimestamp(),
            });

            const postRef = ref(db, `posts/${post.id}`);
            const updates: { [key: string]: any } = {};
            updates[`commentCount`] = (post.commentCount || 0) + 1;
            await update(postRef, updates);

            // Create notification
            if (post.userId !== authUser.uid) {
                await createNotification(db, {
                    recipientId: post.userId,
                    senderId: authUser.uid,
                    senderName: authUser.displayName || 'Someone',
                    senderAvatar: authUser.photoURL || '',
                    senderUsername: authUser.username || '',
                    type: 'comment',
                    postId: post.id,
                });
            }

            setContent("");
            toast({
                title: "Success!",
                description: "Your comment has been posted.",
            });
        } catch (error) {
            console.error("Error creating comment:", error);
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "Could not post your comment.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteComment = async (commentId: string) => {
        if (!db || !authUser) return;
        
        const canDelete = authUser.uid === commentId || authUser.role === 'developer' || authUser.role === 'moderator';
        if (!canDelete) return;

        try {
            const commentRef = ref(db, `comments/${post.id}/${commentId}`);
            await remove(commentRef);
            
            const postRef = ref(db, `posts/${post.id}`);
            const updates: { [key: string]: any } = {};
            updates[`commentCount`] = (post.commentCount || 1) - 1;
            await update(postRef, updates);
            
            toast({
                title: "Deleted",
                description: "Your comment has been deleted.",
            });

        } catch (error) {
             console.error("Error deleting comment:", error);
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "Could not delete your comment.",
            });
        }
    };
    
    const isPostUserVideoAvatar = post.user.avatar && post.user.avatar.startsWith('data:video');
    const isAuthUserVideoAvatar = authUser?.photoURL && authUser.photoURL.startsWith('data:video');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px] p-0">
                <DialogHeader className="p-6">
                    <DialogTitle>Reply to @{post.user.username}</DialogTitle>
                </DialogHeader>
                <div className="flex space-x-4 px-6">
                     <Avatar className="h-10 w-10 border-none">
                        {isPostUserVideoAvatar ? (
                            <video src={post.user.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <AvatarImage src={post.user.avatar} alt={post.user.name} />
                        )}
                        <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold">{post.user.name}</span>
                            {post.user.role === 'developer' && (
                                <span className="developer-badge">Developer</span>
                            )}
                            {post.user.role === 'moderator' && (
                                <span className="moderator-badge">Moderator</span>
                            )}
                             <span className="text-sm text-muted-foreground">@{post.user.username}</span>
                        </div>
                        <p>{post.content}</p>
                    </div>
                </div>

                <div className="p-6 border-y border-border">
                    <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10 border-none">
                            {isAuthUserVideoAvatar ? (
                                <video src={authUser.photoURL!} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <AvatarImage src={authUser?.photoURL || undefined} alt={authUser?.displayName || ""} />
                            )}
                            <AvatarFallback>{authUser?.displayName?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="w-full space-y-3">
                            <Textarea
                                placeholder="Post your reply"
                                className="w-full text-base min-h-20 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 shadow-none bg-transparent"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <div className="flex justify-end">
                                <Button className="rounded-full font-bold" onClick={handleComment} disabled={isSubmitting || !content.trim()}>
                                    {isSubmitting ? "Replying..." : "Reply"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {loadingComments || loadingUsers ? (
                       <>
                         <CommentSkeleton />
                         <CommentSkeleton />
                       </>
                    ) : commentsWithUsers.length > 0 ? (
                        commentsWithUsers.map((comment) => {
                          if (!comment.user) return null;
                          const isCommenterVideoAvatar = comment.user.avatar && comment.user.avatar.startsWith('data:video');
                          return (
                           <Card key={comment.id} className="flex space-x-4 p-4 border-0 border-b rounded-none group">
                                <Avatar className="h-10 w-10 border-none">
                                    {isCommenterVideoAvatar ? (
                                        <video src={comment.user.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                                    )}
                                    <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/dashboard/profile/${comment.user.username}`} className="font-bold hover:underline">{comment.user.name}</Link>
                                            {comment.user.role === 'developer' && (
                                                <span className="developer-badge">Developer</span>
                                            )}
                                            {comment.user.role === 'moderator' && (
                                                <span className="moderator-badge">Moderator</span>
                                            )}
                                            <span className="text-sm text-muted-foreground">@{comment.user.username}</span>
                                            <span className="text-sm text-muted-foreground">·</span>
                                            <span className="text-sm text-muted-foreground hover:underline">
                                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        {(authUser?.uid === comment.userId || authUser?.role === 'developer' || authUser?.role === 'moderator') && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete your comment.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                    <p className="text-base">{comment.content}</p>
                                </div>
                           </Card>
                        )})
                    ) : <p className="text-center py-8 text-muted-foreground">No comments yet.</p>}
                </div>
            </DialogContent>
        </Dialog>
    );
}
