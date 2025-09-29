

'use client';

import { Track } from "@/lib/types";
import Image from "next/image";
import { Button } from "../ui/button";
import { Play, Pause } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useMusicPlayer } from "@/context/music-player-context";
import { cn } from "@/lib/utils";

type ProfileSongPlayerProps = {
    track: Track;
};

export function ProfileSongPlayer({ track }: ProfileSongPlayerProps) {
    const { 
        currentTrack: globalCurrentTrack,
        isPlaying: isGlobalPlaying,
        selectTrack,
        handlePlayPause: globalPlayPause
    } = useMusicPlayer();

    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const isThisTrackGlobal = globalCurrentTrack?.trackId === track.trackId;

    useEffect(() => {
        if (isThisTrackGlobal) {
            setIsPlaying(isGlobalPlaying);
        }
    }, [isGlobalPlaying, isThisTrackGlobal]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [track.previewUrl]);

    const handlePlayPause = () => {
        if (isThisTrackGlobal) {
            globalPlayPause();
        } else {
            selectTrack(track, 0, [track]);
        }
        setIsPlaying(!isPlaying);
    };

    const artworkUrl = track.artworkUrl100.replace('-large.jpg', '-t500x500.jpg');

    return (
        <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-border/50 group bg-secondary/30 backdrop-blur-md">
            <audio ref={audioRef} src={track.previewUrl} preload="auto" />
            
            <div className="relative flex items-center gap-4 p-3">
                <Image src={artworkUrl} alt={track.trackName} width={56} height={56} className="rounded-md flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{track.trackName}</p>
                    <p className="text-sm text-muted-foreground truncate">{track.artistName}</p>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-full bg-primary/20 hover:bg-primary/30 text-primary-foreground flex-shrink-0"
                    onClick={handlePlayPause}
                >
                    {isPlaying ? <Pause /> : <Play className="ml-0.5" />}
                </Button>
            </div>
             <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 w-full">
                <div 
                    className="absolute h-full bg-primary transition-all duration-150" 
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}
