
'use client';

import { useMusicPlayer } from '@/context/music-player-context';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Play, Pause, StepForward, StepBack, Volume2, VolumeX, Heart, ChevronDown, Plus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { AddToPlaylistPopover } from './playlists/add-to-playlist-popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

export function FullScreenPlayer() {
    const { 
        currentTrack, 
        isPlaying, 
        progress, 
        volume, 
        isMuted, 
        audioRef,
        isCurrentTrackFavorite,
        isFullScreenPlayerOpen,
        setIsFullScreenPlayerOpen,
        handlePlayPause, 
        playNext, 
        playPrev,
        setVolume,
        setIsMuted,
        handleProgressChange,
        toggleCurrentTrackFavorite
    } = useMusicPlayer();
    
    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds === Infinity) {
            return "0:00";
        }
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    if (!currentTrack) {
        return null;
    }

    const largeArtworkUrl = currentTrack.artworkUrl100.replace('-large.jpg', '-t500x500.jpg');

    return (
        <Sheet open={isFullScreenPlayerOpen} onOpenChange={setIsFullScreenPlayerOpen}>
            <SheetContent side="bottom" className="h-screen w-screen max-w-full border-none p-0">
                 <SheetHeader>
                    <SheetTitle className="sr-only">Now Playing</SheetTitle>
                 </SheetHeader>
                 <div className="relative h-full w-full flex flex-col items-center justify-center text-white p-8">
                    {/* Background */}
                    <div className="absolute inset-0 -z-10">
                        <Image src={largeArtworkUrl} alt={currentTrack.trackName} fill className="object-cover blur-3xl scale-125" unoptimized/>
                        <div className="absolute inset-0 bg-black/60" />
                    </div>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-6 left-6"
                        onClick={() => setIsFullScreenPlayerOpen(false)}
                    >
                        <ChevronDown className="size-8"/>
                    </Button>

                    <div className="flex flex-col items-center gap-8 w-full max-w-md">
                        {/* Artwork */}
                        <div className="relative w-64 h-64 sm:w-80 sm:h-80 shadow-2xl rounded-lg overflow-hidden">
                             <Image src={largeArtworkUrl} alt={currentTrack.trackName} fill className="object-cover" unoptimized/>
                        </div>

                        {/* Track Info */}
                        <div className="text-center">
                            <h1 className="text-2xl sm:text-3xl font-bold truncate max-w-sm">{currentTrack.trackName}</h1>
                            <p className="text-lg text-white/70">{currentTrack.artistName}</p>
                        </div>

                        {/* Progress Bar */}
                         <div className="w-full space-y-2">
                             <Slider 
                                value={[progress]} 
                                onValueChange={handleProgressChange}
                                className="w-full h-1.5 [&>span:first-child]:h-1.5 [&>span:last-child]:h-3.5 [&>span:last-child]:w-3.5"
                            />
                            <div className="flex justify-between text-xs font-mono">
                                <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                                <span>{formatTime(audioRef.current?.duration || 0)}</span>
                            </div>
                         </div>


                        {/* Main Controls */}
                        <div className="flex items-center justify-center gap-4">
                             <Button variant="ghost" size="icon" className="h-16 w-16" onClick={playPrev}>
                                <StepBack className="size-8" />
                            </Button>
                            <Button size="icon" className="rounded-full h-20 w-20 bg-white/90 text-black hover:bg-white" onClick={handlePlayPause}>
                                {isPlaying ? <Pause className="size-10" /> : <Play className="size-10 fill-black" />}
                            </Button>
                             <Button variant="ghost" size="icon" className="h-16 w-16" onClick={playNext}>
                                <StepForward className="size-8" />
                            </Button>
                        </div>

                        {/* Volume and Extra Controls */}
                        <div className="flex justify-between items-center w-full">
                            <AddToPlaylistPopover track={currentTrack}>
                                <Button variant="ghost" size="icon">
                                    <Plus />
                                </Button>
                            </AddToPlaylistPopover>
                            
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                                    {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
                                </Button>
                                <Slider 
                                    className="w-24" 
                                    value={[isMuted ? 0 : volume * 100]} 
                                    onValueChange={(value) => setVolume(value[0] / 100)}
                                />
                            </div>

                            <Button variant="ghost" size="icon" className={cn("text-white/70 hover:text-white", isCurrentTrackFavorite && "text-red-500")} onClick={toggleCurrentTrackFavorite}>
                                <Heart className={cn("size-6", isCurrentTrackFavorite && "fill-red-500")} />
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
