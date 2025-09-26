
'use client';

import { useMusicPlayer } from '@/context/music-player-context';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Play, Pause, StepForward, StepBack, Volume2, VolumeX, Heart, X, Plus } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { AddToPlaylistPopover } from './playlists/add-to-playlist-popover';

export function MusicPlayer() {
    const pathname = usePathname();
    const { 
        currentTrack, 
        isPlaying, 
        progress, 
        volume, 
        isMuted, 
        audioRef,
        isCurrentTrackFavorite,
        handlePlayPause, 
        playNext, 
        playPrev,
        setVolume,
        setIsMuted,
        handleProgressChange,
        closePlayer,
        toggleCurrentTrackFavorite
    } = useMusicPlayer();

    const isMusicPage = pathname === '/dashboard/music';
    
    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds === Infinity) {
            return "0:00";
        }
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    if (!currentTrack) {
        return <audio ref={audioRef} crossOrigin="anonymous" />;
    }

    if (isMusicPage) {
        return (
             <div className="fixed bottom-0 left-0 right-0 z-50">
                <div className="bg-card/80 backdrop-blur-lg border-t border-border animate-fade-in-up">
                    <Slider 
                        value={[progress]} 
                        onValueChange={handleProgressChange}
                        className="w-full h-1.5 [&>span:first-child]:h-1.5 [&>span:last-child]:h-3.5 [&>span:last-child]:w-3.5"
                    />
                    <div className="p-3 flex items-center gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-1/4">
                             <Image src={currentTrack.artworkUrl100} alt={currentTrack.trackName} width={56} height={56} className="rounded" unoptimized />
                            <div className="min-w-0 hidden sm:block">
                                <p className="font-bold truncate">{currentTrack.trackName}</p>
                                <p className="text-sm text-muted-foreground truncate">{currentTrack.artistName}</p>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center gap-2">
                             <Button variant="ghost" size="icon" onClick={playPrev}>
                                <StepBack />
                            </Button>
                            <Button size="icon" className="rounded-full h-12 w-12" onClick={handlePlayPause}>
                                {isPlaying ? <Pause /> : <Play />}
                            </Button>
                             <Button variant="ghost" size="icon" onClick={playNext}>
                                <StepForward />
                            </Button>
                             <span className="text-xs text-muted-foreground hidden lg:block absolute left-1/2 -translate-x-32">{formatTime(audioRef.current?.currentTime || 0)}</span>
                             <span className="text-xs text-muted-foreground hidden lg:block absolute right-1/2 translate-x-32">{formatTime(audioRef.current?.duration || 0)}</span>
                        </div>
                        
                        <div className="hidden sm:flex items-center gap-2 w-1/4 justify-end">
                            <AddToPlaylistPopover track={currentTrack}>
                                <Button variant="ghost" size="icon">
                                    <Plus />
                                </Button>
                            </AddToPlaylistPopover>
                            <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:text-primary", isCurrentTrackFavorite && "text-primary")} onClick={toggleCurrentTrackFavorite}>
                                <Heart className={cn(isCurrentTrackFavorite && "fill-primary")} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)}>
                                {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
                            </Button>
                            <Slider 
                                className="w-24" 
                                value={[isMuted ? 0 : volume * 100]} 
                                onValueChange={(value) => setVolume(value[0] / 100)}
                            />
                             <Button variant="ghost" size="icon" onClick={closePlayer}>
                                <X />
                            </Button>
                        </div>
                    </div>
                </div>
                 <audio ref={audioRef} crossOrigin="anonymous" />
            </div>
        )
    }

    // Mini player for other pages
    return (
        <div className="fixed bottom-4 right-4 z-50">
             <div className="bg-card/90 backdrop-blur-lg border border-border p-3 flex items-center gap-2 animate-fade-in-up rounded-lg shadow-2xl w-80 sm:w-96">
                <Image src={currentTrack.artworkUrl100} alt={currentTrack.trackName} width={48} height={48} className="rounded" unoptimized />
                <div className='flex-1 min-w-0'>
                    <p className="font-bold truncate text-sm">{currentTrack.trackName}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentTrack.artistName}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playPrev}>
                    <StepBack className="size-5"/>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePlayPause}>
                    {isPlaying ? <Pause className="size-5"/> : <Play className="size-5"/>}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playNext}>
                    <StepForward className="size-5"/>
                </Button>
                 <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-muted-foreground hover:text-primary", isCurrentTrackFavorite && "text-primary")} onClick={toggleCurrentTrackFavorite}>
                    <Heart className={cn("size-5", isCurrentTrackFavorite && "fill-primary")} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closePlayer}>
                    <X className="size-5"/>
                </Button>
            </div>
            <audio ref={audioRef} crossOrigin="anonymous" />
        </div>
    )
}
