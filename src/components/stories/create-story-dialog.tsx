
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDatabase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, serverTimestamp, set, push } from 'firebase/database';
import React, { useState, useRef } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';

type CreateStoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateStoryDialog({ open, onOpenChange }: CreateStoryDialogProps) {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const { toast } = useToast();
  
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSelection = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const handleSubmit = async () => {
    if (!authUser || !mediaFile || !db) return;
    
    setIsSubmitting(true);
    try {
      const storiesRef = ref(db, `stories/${authUser.uid}`);
      const newStoryRef = push(storiesRef);

      // NOTE: In a real-world app, you'd upload to Firebase Storage and get a URL.
      // For this demo, we're storing the Base64 data URI directly.
      const mediaUrl = mediaPreview;
      const createdAt = Date.now();
      const expiresAt = createdAt + 24 * 60 * 60 * 1000; // 24 hours from now

      await set(newStoryRef, {
        userId: authUser.uid,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        createdAt: createdAt,
        expiresAt: expiresAt
      });

      toast({
        title: 'Story Posted!',
        description: "Your story is now live for the next 24 hours.",
      });
      
      clearSelection();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: 'Upload Failed',
        description: 'Could not post your story. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Story</DialogTitle>
          <DialogDescription>
            Share a photo or video. Your story will be visible for 24 hours.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {mediaPreview ? (
            <div className="relative aspect-[9/16] w-full max-w-xs mx-auto rounded-lg overflow-hidden border">
                {mediaType === 'image' ? (
                    <Image src={mediaPreview} alt="Story Preview" fill className="object-cover" />
                ) : (
                    <video src={mediaPreview} muted loop autoPlay className="object-cover w-full h-full" />
                )}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
            >
              <ImageIcon className="size-12 mb-2" />
              <span>Click to upload media</span>
            </button>
          )}
           <Input 
            type="file" 
            accept="image/*,video/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileSelect}
          />
        </div>

        <DialogFooter>
          {mediaFile && (
            <Button type="button" variant="outline" onClick={clearSelection} disabled={isSubmitting}>
              Clear
            </Button>
          )}
          <Button type="submit" disabled={!mediaFile || isSubmitting} onClick={handleSubmit}>
            {isSubmitting && <Loader2 className="mr-2 animate-spin"/>}
            {isSubmitting ? 'Posting...' : 'Post Story'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
