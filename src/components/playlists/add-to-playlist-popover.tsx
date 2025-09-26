
'use client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useDatabase, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Playlist, PlaylistTrack, FavoriteTrack } from "@/lib/types";
import { Track } from "@/lib/music-service";
import { useMemo, useState } from "react";
import { useList } from "@/firebase/rtdb/use-list";
import { ref, set, serverTimestamp, runTransaction } from "firebase/database";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";

type AddToPlaylistPopoverProps = {
    track: Track | FavoriteTrack | PlaylistTrack;
    children: React.ReactNode;
}

export function AddToPlaylistPopover({ track, children }: AddToPlaylistPopoverProps) {
    const { user } = useUser();
    const db = useDatabase();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    
    const playlistsQuery = useMemo(() => {
        if (!user || !db) return null;
        return ref(db, `playlists/${user.uid}`);
    }, [user, db]);

    const { data: playlists, loading } = useList<Playlist>(playlistsQuery);
    
    const handleAddToPlaylist = async (playlist: Playlist) => {
        if (!user || !db) return;

        const playlistTrackRef = ref(db, `playlistTracks/${playlist.id}/${track.trackId}`);

        // Ensure previewUrl exists, by checking all possible types
        const previewUrl = (track as any).previewUrl;

        if (!previewUrl) {
            toast({
                variant: 'destructive',
                title: 'Failed to add track',
                description: 'The track is missing a preview URL.',
            });
            return;
        }

        const trackData: Omit<PlaylistTrack, 'id'> = {
            playlistId: playlist.id,
            userId: user.uid,
            trackId: track.trackId,
            artistName: track.artistName,
            trackName: track.trackName,
            previewUrl: previewUrl,
            artworkUrl100: track.artworkUrl100,
            addedAt: serverTimestamp()
        };

        try {
            await set(playlistTrackRef, trackData);
            
            // Update track count
            const playlistRef = ref(db, `playlists/${user.uid}/${playlist.id}`);
            await runTransaction(playlistRef, (currentData) => {
                if (currentData) {
                    // For simplicity, we just increment. A more robust solution
                    // would check for existence before adding to avoid duplicate counts
                    // if a track can be added multiple times (which it currently can't).
                    currentData.trackCount = (currentData.trackCount || 0) + 1;
                }
                return currentData;
            });
            
            toast({
                title: 'Added to playlist',
                description: `"${track.trackName}" has been added to "${playlist.name}".`,
            });
        } catch (error) {
            console.error("Error adding to playlist:", error);
            toast({
                variant: 'destructive',
                title: 'Failed to add track',
                description: 'There was an error adding the track to the playlist.',
            });
        } finally {
            setOpen(false);
        }
    }


    return (
       <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            {children}
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0">
            <Command>
                 <CommandInput placeholder="Add to playlist..." />
                 <CommandList>
                    <CommandEmpty>{loading ? 'Loading...' : 'No playlists found.'}</CommandEmpty>
                    <CommandGroup>
                        {playlists.map(playlist => (
                            <CommandItem key={playlist.id} onSelect={() => handleAddToPlaylist(playlist)}>
                                {playlist.name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                 </CommandList>
            </Command>
        </PopoverContent>
       </Popover>
    )
}
