'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDatabase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, serverTimestamp, set, push } from 'firebase/database';
import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export function CreatePlaylistDialog() {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !name.trim() || !db) return;
    
    setIsSubmitting(true);
    try {
        const playlistsRef = ref(db, `playlists/${authUser.uid}`);
        const newPlaylistRef = push(playlistsRef);
        await set(newPlaylistRef, {
            userId: authUser.uid,
            name: name,
            createdAt: serverTimestamp(),
            trackCount: 0,
        });

        toast({
            title: 'Playlist Created',
            description: `"${name}" has been created.`,
        });
        
        setName('');
        setIsOpen(false);
    } catch (error) {
         toast({
            variant: "destructive",
            title: 'Creation Failed',
            description: 'Could not create your playlist. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Plus className="mr-2"/>
            New Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a new playlist</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">
                    Cancel
                </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
