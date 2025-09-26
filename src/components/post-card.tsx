
'use client';

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Heart, MessageCircle, Repeat, Share, MoreHorizontal, Trash2, Bookmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useUser, useDatabase } from "@/firebase";
import { ref, update, onValue, remove, serverTimestamp, set } from "firebase/database";
import React, { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Post, User } from "@/lib/types";
import { CommentDialog } from "./comment-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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


type PostCardProps = {
  post: Post & { user: User };
};


const PostContent = ({ post }: { post: Post & { user: User } }) => {
  const contentWithHashtags = useMemo(() => {
    return post.content.split(/(\s+)/).map((part, index) => {
      if (part.startsWith('#')) {
        const tag = part.substring(1);
        return (
          <Link key={index} href={`/dashboard/explore?tag=${tag}`} className="text-primary hover:underline">
            {part}
          </Link>
        );
      }
      return part;
    });
  }, [post.content]);

  return (
    <>
      <p className="leading-relaxed whitespace-pre-wrap">{contentWithHashtags}</p>
      {post.image && (
        <div className="relative mt-2 aspect-[16/9] w-full overflow-hidden rounded-2xl border">
          <Image
            src={post.image}
            alt="Post image"
            fill
            className="object-cover"
            data-ai-hint="social media post"
          />
        </div>
      )}
    </>
  );
};

export function PostCard({ post }: PostCardProps) {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!authUser || !db) return;

    const postRef = ref(db, `posts/${post.id}`);
    const bookmarkRef = ref(db, `bookmarks/${authUser.uid}/${post.id}`);

    const unsubscribePost = onValue(postRef, (snapshot) => {
        const postData = snapshot.val();
        if (postData) {
            setLikeCount(postData.likeCount || 0);
            setCommentCount(postData.commentCount || 0);
            setRepostCount(postData.repostCount || 0);
            setIsLiked(postData.likes?.[authUser.uid] || false);
            setIsReposted(postData.reposts?.[authUser.uid] || false);
        }
    });

    const unsubscribeBookmark = onValue(bookmarkRef, (snapshot) => {
        setIsBookmarked(snapshot.exists());
    });

    return () => {
        unsubscribePost();
        unsubscribeBookmark();
    };

  }, [post.id, authUser, db]);


  const handleLike = async () => {
    if (!authUser || !db) return;

    const newLikeCount = isLiked ? likeCount - 1 : likeCount + 1;
    const updates: { [key: string]: any } = {};
    updates[`posts/${post.id}/likeCount`] = newLikeCount;
    updates[`posts/${post.id}/likes/${authUser.uid}`] = isLiked ? null : true;
    
    await update(ref(db), updates);
  };
  
  const handleRepost = async () => {
    if (!authUser || !db) return;
    
    const newRepostCount = isReposted ? repostCount - 1 : repostCount + 1;
    const updates: { [key: string]: any } = {};
    updates[`posts/${post.id}/repostCount`] = newRepostCount;
    updates[`posts/${post.id}/reposts/${authUser.uid}`] = isReposted ? null : true;
    
    await update(ref(db), updates);
  }
  
  const handleBookmark = async () => {
    if (!authUser || !db) return;

    const bookmarkRef = ref(db, `bookmarks/${authUser.uid}/${post.id}`);

    if (isBookmarked) {
        await remove(bookmarkRef);
        toast({ title: "Removed from bookmarks" });
    } else {
        await set(bookmarkRef, {
            postId: post.id,
            bookmarkedAt: serverTimestamp(),
        });
        toast({ title: "Added to bookmarks" });
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const shareData = {
        title: `Post by ${post.user.name}`,
        text: post.content,
        url: postUrl,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            // This can happen if the user cancels the share dialog.
            // It's not a critical error, so we can safely ignore it.
        }
    } else {
        // Fallback for browsers that don't support Web Share API
        try {
            await navigator.clipboard.writeText(postUrl);
            toast({
                title: "Link Copied!",
                description: "The link to the post has been copied to your clipboard.",
            });
        } catch (error) {
            console.error("Error copying to clipboard:", error);
             toast({
                variant: "destructive",
                title: "Oops!",
                description: "Could not copy the link.",
            });
        }
    }
  };

  const handleDelete = async () => {
    if (!authUser || !db) return;

    const canDelete = authUser.uid === post.userId || authUser.role === 'developer' || authUser.role === 'moderator';
    if (!canDelete) return;

    try {
        const updates: { [key: string]: any } = {};
        updates[`/posts/${post.id}`] = null;
        updates[`/comments/${post.id}`] = null;

        await update(ref(db), updates);

        toast({
            title: "Post Deleted",
            description: "The post has been successfully deleted.",
        });
    } catch (error) {
        console.error("Error deleting post:", error);
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Could not delete the post.",
        });
    }
    setIsDeleteDialogOpen(false);
  };


  if (!post.user) {
    return null;
  }
  
  const postDate = new Date(post.createdAt);
  const canDelete = authUser?.uid === post.userId || authUser?.role === 'developer' || authUser?.role === 'moderator';

  return (
    <Card as="article" className="flex flex-col p-4 rounded-lg animate-fade-in-up">
      <CommentDialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen} post={post} />
      
      <div className="flex space-x-4">
        <Avatar className="h-10 w-10 border-none">
          <AvatarImage src={post.user.avatar} alt={post.user.name} />
          <AvatarFallback>{post.user.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/dashboard/profile/${post.user.username}`} className="font-bold hover:underline">{post.user.name}</Link>
                  {post.user.role === 'developer' && (
                    <span className="developer-badge">Developer</span>
                  )}
                  {post.user.role === 'moderator' && (
                    <span className="moderator-badge">Moderator</span>
                  )}
                  <span className="text-sm text-muted-foreground">@{post.user.username}</span>
                  <span className="text-sm text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground hover:underline">
                      {formatDistanceToNow(postDate, { addSuffix: true })}
                  </span>
              </div>
              
            {canDelete && (
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="size-5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this post and all its comments.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          
           <PostContent post={post}/>

          <div className="flex justify-between items-center pt-2 max-w-sm">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors" onClick={() => setIsCommentDialogOpen(true)}>
                <MessageCircle className="size-5" />
                <span>{commentCount}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                    "flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-colors",
                    isReposted && "text-green-500"
                )} 
                onClick={handleRepost}
              >
                <Repeat className={cn("size-5", isReposted && "text-green-500")} />
                <span>{repostCount}</span>
              </Button>
              <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                      "flex items-center gap-2 text-muted-foreground hover:text-red-500 transition-colors",
                      isLiked && "text-red-500"
                  )}
                  onClick={handleLike}
              >
                <Heart className={cn("size-5", isLiked && "fill-red-500 text-red-500")} />
                <span>{likeCount}</span>
              </Button>
              <div className="flex items-center">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                        "text-muted-foreground hover:text-primary transition-colors",
                        isBookmarked && "text-primary"
                    )}
                    onClick={handleBookmark}
                >
                    <Bookmark className={cn("size-5", isBookmarked && "fill-primary")} />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors" onClick={handleShare}>
                    <Share className="size-5" />
                </Button>
              </div>
        </div>
        </div>
      </div>
    </Card>
  );
}
