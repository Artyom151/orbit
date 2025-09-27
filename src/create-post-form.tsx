
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDatabase, useUser } from "@/firebase";
import { ref, push, set, serverTimestamp } from "firebase/database";
import { Image as ImageIcon, Music, X } from "lucide-react";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export function CreatePostForm() {
  const { user } = useUser();
  const db = useDatabase();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!user) {
    return null;
  }
  
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        // For now, we'll just show a preview. 
        // In a real app, you'd upload this to Firebase Storage.
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        }
        reader.readAsDataURL(file);
        setImageFile(file);
    }
  }

  const handlePost = async () => {
    if ((!content.trim() && !imageFile) || !user || !db) return;

    setIsSubmitting(true);
    try {
      // In a real app, you would upload the imageFile to Firebase Storage
      // and get a downloadURL. For this demo, we'll use the base64 preview.
      const imageUrl = imagePreview;

      const postsRef = ref(db, "posts");
      const newPostRef = push(postsRef);
      await set(newPostRef, {
        userId: user.uid,
        content: content,
        image: imageUrl,
        likeCount: 0,
        repostCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      });

      setContent("");
      setImagePreview(null);
      setImageFile(null);

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

  return (
    <div className="border-b border-border p-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12 border-none">
          <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
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

          {imagePreview && (
            <div className="relative">
                <Image src={imagePreview} alt="Image preview" width={500} height={300} className="rounded-2xl object-cover max-h-96 w-full"/>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50 hover:bg-black/75 rounded-full" onClick={() => {setImagePreview(null); setImageFile(null)}}>
                    <X className="text-white"/>
                </Button>
            </div>
          )}

          <div className="flex justify-between items-center">
              <div className="flex gap-0 text-primary">
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect}/>
                  <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 transition-colors" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="size-5" />
                      <span className="sr-only">Add image</span>
                  </Button>
                   <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10 transition-colors">
                      <Music className="size-5" />
                      <span className="sr-only">Add music</span>
                  </Button>
              </div>
            <Button className="rounded-full font-bold" onClick={handlePost} disabled={isSubmitting || (!content.trim() && !imageFile)}>
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
