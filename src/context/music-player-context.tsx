
'use client';

import type { FavoriteTrack, PlaylistTrack } from "@/lib/types";
import type { Track } from "@/lib/music-service";
import React, { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useDatabase, useUser } from "@/firebase";
import { useList } from "@/firebase/rtdb/use-list";
import { ref, serverTimestamp, set, remove } from "firebase/database";
import { useToast } from "@/hooks/use-toast";


type MusicPlayerContextType = {
    currentTrack: Track | FavoriteTrack | PlaylistTrack | null;
    currentTrackIndex: number | null;
    currentPlaylist: (Track | FavoriteTrack | PlaylistTrack)[];
    isPlaying: boolean;
    progress: number;
    volume: number;
    isMuted: boolean;
    audioRef: React.RefObject<HTMLAudioElement>;
    isCurrentTrackFavorite: boolean;
    isFullScreenPlayerOpen: boolean;
    setIsFullScreenPlayerOpen: (isOpen: boolean) => void;
    selectTrack: (track: Track | FavoriteTrack | PlaylistTrack, index: number, playlist: (Track | FavoriteTrack | PlaylistTrack)[]) => void;
    handlePlayPause: () => void;
    playNext: () => void;
    playPrev: () => void;
    setVolume: (volume: number) => void;
    setIsMuted: (isMuted: boolean) => void;
    handleProgressChange: (value: number[]) => void;
    closePlayer: () => void;
    toggleCurrentTrackFavorite: () => void;
};

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
    const { user } = useUser();
    const db = useDatabase();
    const { toast } = useToast();

    const [currentTrack, setCurrentTrack] = useState<Track | FavoriteTrack | PlaylistTrack | null>(null);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
    const [currentPlaylist, setCurrentPlaylist] = useState<(Track | FavoriteTrack | PlaylistTrack)[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullScreenPlayerOpen, setIsFullScreenPlayerOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);


    const audioRef = useRef<HTMLAudioElement>(null);
    
    const favoriteTracksQuery = useMemo(() => {
        if (!user || !db) return null;
        return ref(db, `favoriteTracks/${user.uid}`);
    }, [user, db]);

    const { data: favoriteTracks } = useList<FavoriteTrack>(favoriteTracksQuery);
    const favoriteTrackIds = useMemo(() => new Set(favoriteTracks.map(t => t.trackId)), [favoriteTracks]);
    
    const isCurrentTrackFavorite = useMemo(() => {
        if (!currentTrack) return false;
        return favoriteTrackIds.has(currentTrack.trackId);
    }, [currentTrack, favoriteTrackIds]);

    const selectTrack = useCallback((track: Track | FavoriteTrack | PlaylistTrack, index: number, playlist: (Track | FavoriteTrack | PlaylistTrack)[]) => {
        setCurrentTrack(track);
        setCurrentTrackIndex(index);
        setCurrentPlaylist(playlist);
        setIsPlaying(true);
    }, []);
    
     const closePlayer = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
        setCurrentTrack(null);
        setCurrentPlaylist([]);
        setCurrentTrackIndex(null);
        setIsPlaying(false);
        setProgress(0);
        setIsFullScreenPlayerOpen(false);
    }, []);

    const playNext = useCallback(() => {
        if (currentTrackIndex !== null && currentTrackIndex + 1 < currentPlaylist.length -1) {
            const nextIndex = currentTrackIndex + 1;
            selectTrack(currentPlaylist[nextIndex], nextIndex, currentPlaylist);
        } else {
            closePlayer();
        }
    }, [currentTrackIndex, currentPlaylist, selectTrack, closePlayer]);
    
    const playPrev = useCallback(() => {
        if (currentTrackIndex !== null && currentTrackIndex > 0) {
            selectTrack(currentPlaylist[currentTrackIndex - 1], currentTrackIndex - 1, currentPlaylist);
        }
    }, [currentTrackIndex, currentPlaylist, selectTrack]);

    const handlePlayPause = useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);
    
    const handleProgressChange = (value: number[]) => {
        if (audioRef.current && audioRef.current.duration) {
          audioRef.current.currentTime = (value[0] / 100) * audioRef.current.duration;
        }
    }
    
    const toggleCurrentTrackFavorite = async () => {
        if (!user || !db || !currentTrack) {
            toast({ variant: "destructive", title: "Please log in to save favorites." });
            return;
        }

        const previewUrl = (currentTrack as any).previewUrl;
        if (!previewUrl) {
            toast({ variant: "destructive", title: "Cannot favorite track", description: "This track is missing a playable URL." });
             console.error("Failing track data for favorite:", currentTrack);
            return;
        }

        const favoriteRef = ref(db, `favoriteTracks/${user.uid}/${currentTrack.trackId}`);
        
        if (isCurrentTrackFavorite) {
            await remove(favoriteRef);
             toast({ title: "Removed from favorites" });
        } else {
            const favoriteData: Omit<FavoriteTrack, 'id'> & { favoritedAt: any } = {
                userId: user.uid,
                trackId: currentTrack.trackId,
                artistName: currentTrack.artistName,
                trackName: currentTrack.trackName,
                previewUrl: previewUrl,
                artworkUrl100: currentTrack.artworkUrl100,
                favoritedAt: serverTimestamp(),
            };
            await set(favoriteRef, favoriteData);
            toast({ title: "Added to favorites" });
        }
    };


    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => {
          if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        };
        const onEnded = () => playNext();
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);

        return () => {
          audio.removeEventListener('timeupdate', onTimeUpdate);
          audio.removeEventListener('ended', onEnded);
          audio.removeEventListener('play', onPlay);
          audio.removeEventListener('pause', onPause);
        };
    }, [playNext]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        const newSrc = (currentTrack as any)?.previewUrl;
        
        if (!newSrc) {
            console.error("Music Player Error: Track has no previewUrl.", currentTrack);
            toast({
                variant: "destructive",
                title: "Error Playing Track",
                description: "Could not load the selected track source.",
            });
            setIsPlaying(false);
            return;
        }

        if (audio.src !== newSrc) {
            audio.src = newSrc;
        }

        if (isPlaying) {
             audio.play().catch(e => {
                console.error("Music Player Error: Failed to play audio.", e);
                console.error("Failing track data:", currentTrack);
                toast({
                    variant: "destructive",
                    title: "Error Playing Track",
                    description: "Could not load the selected track source.",
                });
                setIsPlaying(false); 
            });
        } else {
            audio.pause();
        }

    }, [currentTrack, isPlaying, toast]);
    
     useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const value = {
        currentTrack,
        currentTrackIndex,
        currentPlaylist,
        isPlaying,
        progress,
        volume,
        isMuted,
        audioRef,
        isCurrentTrackFavorite,
        isFullScreenPlayerOpen,
        setIsFullScreenPlayerOpen,
        selectTrack,
        handlePlayPause,
        playNext,
        playPrev,
        setVolume,
        setIsMuted,
        handleProgressChange,
        closePlayer,
        toggleCurrentTrackFavorite
    };

    return (
        <MusicPlayerContext.Provider value={value}>
            {children}
            {isMounted && <audio ref={audioRef} crossOrigin="anonymous" />}
        </MusicPlayerContext.Provider>
    );
}

export function useMusicPlayer() {
    const context = useContext(MusicPlayerContext);
    if (context === undefined) {
        throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
    }
    return context;
}
