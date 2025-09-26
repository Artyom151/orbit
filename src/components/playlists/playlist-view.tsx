'use client';
import { useMemo } from "react";
import { useDatabase, useUser } from "@/firebase";
import { useList } from "@/firebase/rtdb/use-list";
import { useObject } from "@/firebase/rtdb/use-object";
import type { Playlist, PlaylistTrack } from "@/lib/types";
import { ref, runTransaction } from "firebase/database";
import { Button } from "../ui/button";
import { ArrowLeft, Play, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useMusicPlayer } from "@/context/music-player-context";
import { Skeleton } from "../ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { remove } from "firebase/database";


type PlaylistViewProps = {
    playlistId: string;
    onBack: () => void;
}

const TrackSkeleton = () => (
    <div className="flex items-center space-x-4 p-2">
        <Skeleton className="h-12 w-12 rounded" />
        <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
        </div>
    </div>
);

export function PlaylistView({ playlistId, onBack }: PlaylistViewProps) {
    const { user } = useUser();
    const db = useDatabase();
    const { selectTrack, isCurrentTrackFavorite, toggleCurrentTrackFavorite } = useMusicPlayer();
    const { toast } = useToast();

    const playlistRef = useMemo(() => {
        if (!user || !db) return null;
        return ref(db, `playlists/${user.uid}/${playlistId}`);
    }, [user, db, playlistId]);

    const { data: playlist, loading: loadingPlaylist } = useObject<Playlist>(playlistRef);
    
    const tracksRef = useMemo(() => {
        if (!db) return null;
        return ref(db, `playlistTracks/${playlistId}`);
    }, [db, playlistId]);

    const { data: tracks, loading: loadingTracks } = useList<PlaylistTrack>(tracksRef);
    
    const sortedTracks = useMemo(() => {
        return tracks.sort((a, b) => a.addedAt - b.addedAt);
    }, [tracks]);
    
    const handlePlayPlaylist = () => {
        if (sortedTracks.length > 0) {
            selectTrack(sortedTracks[0], 0, sortedTracks);
        }
    }
    
    const handleRemoveTrack = async (trackId: number) => {
        if (!user || !db || !playlist) return;
        const trackRef = ref(db, `playlistTracks/${playlistId}/${trackId}`);
        const playlistDataRef = ref(db, `playlists/${user.uid}/${playlistId}`);

        try {
            await remove(trackRef);
             await runTransaction(playlistDataRef, (currentData) => {
                if (currentData) {
                    currentData.trackCount = (currentData.trackCount || 1) - 1;
                }
                return currentData;
            });
            toast({
                title: 'Track removed',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Failed to remove track',
            });
        }
    }

    if (loadingPlaylist) {
        return <div className="p-4"><p>Loading playlist...</p></div>
    }

    if (!playlist) {
        return (
            <div className="p-4">
                <p>Playlist not found.</p>
                <Button onClick={onBack} variant="outline" className="mt-4">Go Back</Button>
            </div>
        )
    }

    return (
        <div className="animate-fade-in-up">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-2 px-4 border-b border-border flex items-center gap-6">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">{playlist.name}</h1>
                    <p className="text-sm text-muted-foreground">{playlist.trackCount || 0} tracks</p>
                </div>
            </div>
            
            <div className="p-4">
                <Button onClick={handlePlayPlaylist} disabled={sortedTracks.length === 0} className="w-full">
                    <Play className="mr-2"/>
                    Play Playlist
                </Button>
            </div>
            
             <div className="space-y-2 pb-32 p-4">
                {loadingTracks ? (
                    Array.from({length: 5}).map((_, i) => <TrackSkeleton key={i} />)
                ) : sortedTracks.length > 0 ? (
                    sortedTracks.map((track, index) => (
                        <Card 
                            key={track.trackId}
                            onClick={() => selectTrack(track, index, sortedTracks)}
                            className="p-2 flex items-center gap-4 cursor-pointer hover:bg-secondary transition-colors rounded-lg group"
                        >
                            <Image src={track.artworkUrl100} alt={track.trackName} width={48} height={48} className="rounded" unoptimized />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{track.trackName}</p>
                                <p className="text-sm text-muted-foreground truncate">{track.artistName}</p>
                            </div>
                           
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <Trash2 className="size-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Remove from playlist?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to remove "{track.trackName}" from this playlist?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRemoveTrack(track.trackId)}>Remove</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </Card>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        <p>This playlist is empty.</p>
                        <p className="text-sm">Use the search to find and add songs.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
