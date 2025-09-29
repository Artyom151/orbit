

'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDatabase, useUser } from "@/firebase";
import { ref, push, set, serverTimestamp } from "firebase/database";
import { Image as ImageIcon, Music, X, Film, Plus } from "lucide-react";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import type { Track, MediaItem } from "@/lib/types";
import { AttachMusicDialog } from "./posts/attach-music-dialog";
import { Card } from "./ui/card";

type CreatePostFormProps = {
  groupId?: string;
}

export function CreatePostForm({ groupId }: CreatePostFormProps) {
  const { user } = useUser();
  const db = useDatabase();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  
  const [attachedTrack, setAttachedTrack] = useState<Track | null>(null);
  const [isMusicDialogOpen, setIsMusicDialogOpen] = useState(false);

  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!user) {
    return null;
  }
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
        Array.from(files).forEach(file => {
            if (media.length >= 4) {
                toast({ variant: 'destructive', title: 'Maximum 4 files allowed.' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const src = reader.result as string;
                const type = file.type.startsWith('video') ? 'video' : 'image';
                setMedia(prev => [...prev, { src, type }]);
            }
            reader.readAsDataURL(file);
        });
    }
  }
  
  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  }

  const handlePost = async () => {
    if ((!content.trim() && media.length === 0 && !attachedTrack) || !user || !db) return;

    setIsSubmitting(true);
    try {
      // In a real app, you would upload the files to Firebase Storage
      // and get downloadURLs. For this demo, we'll use the base64 data URIs.
      const postsRef = ref(db, "posts");
      const newPostRef = push(postsRef);
      
      const postData: any = {
        userId: user.uid,
        content: content,
        media: media,
        track: attachedTrack,
        likeCount: 0,
        repostCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      };
      
      if (groupId) {
          postData.groupId = groupId;
      }
      
      await set(newPostRef, postData);

      setContent("");
      setMedia([]);
      setAttachedTrack(null);

      toast({
        title: "Success!",
        description: "Your post has been published.",
      });
      
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not create your post.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSelectTrack = (track: Track) => {
    setAttachedTrack(track);
    setIsMusicDialogOpen(false);
  }
  
  const isVideoAvatar = user.photoURL && user.photoURL.startsWith('data:video');

  return (
    <>
    <AttachMusicDialog open={isMusicDialogOpen} onOpenChange={setIsMusicDialogOpen} onSelectTrack={handleSelectTrack} />
    <div className="border-b border-border p-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12 border-none">
          {isVideoAvatar ? (
            <video src={user.photoURL} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
          ) : (
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
          )}
          <AvatarFallback>{user.displayName?.charAt(0) || "?"}</AvatarFallback>
        </Avatar>
        <div className="w-full space-y-2">
          <Textarea
            placeholder={`What's new?`}
            className="w-full text-lg min-h-20 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 shadow-none bg-transparent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
          />

          {media.length > 0 && (
            <div className="grid gap-2 grid-cols-2">
                {media.map((item, index) => (
                    <div key={index} className="relative">
                        {item.type === 'image' ? (
                             <Image src={item.src} alt="Image preview" width={250} height={150} className="rounded-2xl object-cover h-full w-full aspect-video"/>
                        ) : (
                             <video src={item.src} muted loop autoPlay className="rounded-2xl object-cover h-full w-full aspect-video" />
                        )}
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 bg-black/50 hover:bg-black/75 rounded-full h-7 w-7" onClick={() => removeMedia(index)}>
                            <X className="text-white size-4"/>
                        </Button>
                    </div>
                ))}
            </div>
          )}

          {attachedTrack && (
             <Card className="relative p-2 flex items-center gap-3">
                <Image src={attachedTrack.artworkUrl100} alt={attachedTrack.trackName} width={48} height={48} className="rounded" />
                <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-sm">{attachedTrack.trackName}</p>
                    <p className="text-muted-foreground truncate text-xs">{attachedTrack.artistName}</p>
                </div>
                 <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => setAttachedTrack(null)}>
                    <X className="size-4" />
                 </Button>
            </Card>
          )}

          <div className="flex justify-between items-center">
              <div className="flex gap-0 text-primary">
                  <input type="file" accept="image/*,video/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect}/>
                  <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 transition-colors" onClick={() => fileInputRef.current?.click()} disabled={media.length >= 4}>
                      <ImageIcon className="size-5" />
                      <span className="sr-only">Add image or video</span>
                  </Button>
                   <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 transition-colors" onClick={() => setIsMusicDialogOpen(true)}>
                      <Music className="size-5" />
                      <span className="sr-only">Add music</span>
                  </Button>
              </div>
            <Button className="rounded-full font-bold" onClick={handlePost} disabled={isSubmitting || (!content.trim() && media.length === 0 && !attachedTrack)}>
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
