

'use client';

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Heart, MessageCircle, Repeat, Share, MoreHorizontal, Trash2, Bookmark, Play, AlertTriangle, Pin, PinOff, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useUser, useDatabase } from "@/firebase";
import { ref, update, onValue, remove, serverTimestamp, set, push } from "firebase/database";
import React, { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Post, User, Comment } from "@/lib/types";
import { CommentDialog } from "./comment-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
} from "@/components/ui/alert-dialog";
import { useMusicPlayer } from "@/context/music-player-context";
import { ReportDialog } from "./report-dialog";
import { createNotification } from "@/lib/notification-service";
import { useList } from "@/firebase/rtdb/use-list";
import { Textarea } from "./ui/textarea";
import { Skeleton } from "./ui/skeleton";
import { updateUserProfile } from "@/lib/auth-service";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";


type PostCardProps = {
  post: Post & { user: User };
  isPinned?: boolean;
};


const PostContent = ({ post }: { post: Post & { user: User } }) => {
  const { selectTrack } = useMusicPlayer();

  const contentWithHashtags = useMemo(() => {
    if (!post.content) return '';
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
      <p className="leading-relaxed whitespace-pre-wrap text-base">{contentWithHashtags}</p>
      {post.media && post.media.length > 0 && (
         <Carousel className="w-full mt-2 -ml-4">
            <CarouselContent>
                {post.media.map((item, index) => (
                    <CarouselItem key={index} className="basis-full">
                         <div className="relative aspect-video w-full overflow-hidden rounded-2xl border ml-4">
                            {item.type === 'image' ? (
                                <Image src={item.src} alt="Post media" fill className="object-cover" />
                            ) : (
                                <video src={item.src} controls muted loop className="object-cover w-full h-full" />
                            )}
                         </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            {post.media.length > 1 && (
                <>
                    <CarouselPrevious className="left-6" />
                    <CarouselNext className="right-6" />
                </>
            )}
        </Carousel>
      )}
      {post.track && (
        <Card 
            className="mt-2 p-3 flex items-center gap-4 cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => selectTrack(post.track!, 0, [post.track!])}
        >
            <div className="relative h-20 w-20 flex-shrink-0">
                <Image src={post.track.artworkUrl100} alt={post.track.trackName} fill className="rounded-md object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-md">
                    <Play className="text-white fill-white"/>
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{post.track.trackName}</p>
                <p className="text-sm text-muted-foreground truncate">{post.track.artistName}</p>
            </div>
        </Card>
      )}
    </>
  );
};

const CommentSkeleton = () => (
    <div className="flex items-start gap-3 pt-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-1/2" />
        </div>
    </div>
);

const PostComments = ({ post, onCommentCountChange }: { post: Post & { user: User }, onCommentCountChange: (newCount: number) => void }) => {
    const { user: authUser } = useUser();
    const db = useDatabase();
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const commentsQuery = useMemo(() => ref(db, `comments/${post.id}`), [db, post.id]);
    const { data: commentsData, loading: loadingComments } = useList<Comment>(commentsQuery);
    
    const usersQuery = useMemo(() => ref(db, "users"), [db]);
    const { data: usersData, loading: loadingUsers } = useList<User>(usersQuery);

    const commentsWithUsers = useMemo(() => {
        if (!commentsData || !usersData) return [];
        const usersMap = new Map(usersData.map(u => [u.id, u]));
        return commentsData
            .map(comment => ({
                ...comment,
                user: usersMap.get(comment.userId)
            }))
            .filter(c => c.user)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 2); 
    }, [commentsData, usersData]);

    const handleComment = async () => {
        if (!content.trim() || !authUser || !db) return;
        setIsSubmitting(true);
        try {
            const commentRef = push(ref(db, `comments/${post.id}`));
            await set(commentRef, {
                userId: authUser.uid,
                postId: post.id,
                content: content,
                createdAt: serverTimestamp(),
            });

            const newCount = (post.commentCount || 0) + 1;
            await update(ref(db, `posts/${post.id}`), { commentCount: newCount });
            onCommentCountChange(newCount);

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
            toast({ title: "Reply sent!" });
        } catch (error) {
            toast({ variant: "destructive", title: "Could not post your reply." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pt-4 border-t border-border mt-2 space-y-4">
            <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border-none">
                    <AvatarImage src={authUser?.photoURL || ''} />
                    <AvatarFallback>{authUser?.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="w-full">
                    <Textarea 
                        placeholder="Post your reply..." 
                        className="bg-secondary border-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 min-h-[38px] text-sm"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />
                    {content && (
                        <div className="mt-2 flex justify-end">
                            <Button size="sm" onClick={handleComment} disabled={isSubmitting}>
                                {isSubmitting ? 'Replying...' : 'Reply'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {loadingComments || loadingUsers ? (
                <CommentSkeleton />
            ) : commentsWithUsers.reverse().map(comment => {
              const isVideoAvatar = comment.user?.avatar && comment.user.avatar.startsWith('data:video');
              return (
                <div key={comment.id} className="flex items-start gap-3 pt-2">
                    <Avatar className="h-8 w-8 border-none">
                        {isVideoAvatar ? (
                            <video src={comment.user.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <AvatarImage src={comment.user?.avatar} />
                        )}
                        <AvatarFallback>{comment.user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm bg-secondary rounded-lg px-3 py-2 w-full">
                        <Link href={`/dashboard/profile/${comment.user?.username}`} className="font-bold hover:underline">{comment.user?.name}</Link>
                        <p className="whitespace-pre-wrap">{comment.content}</p>
                    </div>
                </div>
            )})}
        </div>
    );
};


export function PostCard({ post, isPinned }: PostCardProps) {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
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
    
    if (!isLiked && post.userId !== authUser.uid) {
       await createNotification(db, {
          recipientId: post.userId,
          senderId: authUser.uid,
          senderName: authUser.displayName || 'Someone',
          senderAvatar: authUser.photoURL || '',
          senderUsername: authUser.username || '',
          type: 'like',
          postId: post.id,
       });
    }
  };
  
  const handleRepost = async () => {
    if (!authUser || !db) return;
    
    const newRepostCount = isReposted ? repostCount - 1 : repostCount + 1;
    const updates: { [key: string]: any } = {};
    updates[`posts/${post.id}/repostCount`] = newRepostCount;
    updates[`posts/${post.id}/reposts/${authUser.uid}`] = isReposted ? null : true;
    
    await update(ref(db), updates);

    if (!isReposted && post.userId !== authUser.uid) {
       await createNotification(db, {
          recipientId: post.userId,
          senderId: authUser.uid,
          senderName: authUser.displayName || 'Someone',
          senderAvatar: authUser.photoURL || '',
          senderUsername: authUser.username || '',
          type: 'repost',
          postId: post.id,
       });
    }
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
        
        // Unpin if it was pinned
        if (authUser.pinnedPostId === post.id) {
          updates[`/users/${authUser.uid}/pinnedPostId`] = null;
        }

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
  
  const handleTogglePin = async () => {
    if (!authUser || authUser.uid !== post.userId) return;

    const newPinnedPostId = authUser.pinnedPostId === post.id ? null : post.id;
    try {
      await updateUserProfile(authUser.uid, { pinnedPostId: newPinnedPostId });
      toast({
        title: newPinnedPostId ? "Post Pinned" : "Post Unpinned",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
    }
  }


  if (!post.user) {
    return null;
  }
  
  const postDate = new Date(post.createdAt);
  const canDelete = authUser?.uid === post.userId || authUser?.role === 'developer' || authUser?.role === 'moderator';
  const isVideoAvatar = post.user.avatar && post.user.avatar.startsWith('data:video');
  const isOwnProfilePost = authUser?.uid === post.userId;
  const isPostPinned = authUser?.pinnedPostId === post.id;


  return (
    <div className="flex flex-col p-4 border-b animate-fade-in-up">
      {isPinned && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 ml-10">
          <Pin className="size-3.5" />
          Pinned
        </div>
      )}
      <CommentDialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen} post={post} />
      <ReportDialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} post={post} />
      
      <div className="flex space-x-4">
        <Avatar className="h-10 w-10 border-none">
          {isVideoAvatar ? (
            <video src={post.user.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
          ) : (
            <AvatarImage src={post.user.avatar} alt={post.user.name} />
          )}
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
              
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="size-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {isOwnProfilePost && (
                  <DropdownMenuItem onSelect={handleTogglePin}>
                    {isPostPinned ? <PinOff className="mr-2 size-4" /> : <Pin className="mr-2 size-4" />}
                    {isPostPinned ? "Unpin from profile" : "Pin to profile"}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
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
                {!isOwnProfilePost && (
                  <DropdownMenuItem onSelect={() => setIsReportDialogOpen(true)}>
                      <AlertTriangle className="mr-2 size-4" />
                      Report post
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>Not interested in this post</DropdownMenuItem>
                <DropdownMenuItem>Follow @{post.user.username}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
          
           <PostContent post={post}/>

          <div className="flex justify-between items-center pt-2 max-w-sm">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors" onClick={() => setShowComments(!showComments)}>
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
        {showComments && <PostComments post={post} onCommentCountChange={setCommentCount} />}
        </div>
      </div>
    </div>
  );
}
