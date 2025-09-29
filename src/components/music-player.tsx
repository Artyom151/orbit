
'use client';

import { useMusicPlayer } from '@/context/music-player-context';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Play, Pause, StepForward, StepBack, Heart, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { FullScreenPlayer } from './full-screen-player';


export function MusicPlayer() {
    const pathname = usePathname();
    const { 
        currentTrack, 
        isPlaying, 
        audioRef,
        isCurrentTrackFavorite,
        handlePlayPause, 
        playNext, 
        playPrev,
        closePlayer,
        toggleCurrentTrackFavorite,
        isFullScreenPlayerOpen,
        setIsFullScreenPlayerOpen
    } = useMusicPlayer();

    const isMusicPage = pathname === '/dashboard/music';
    
    if (!currentTrack) {
        return <audio ref={audioRef} crossOrigin="anonymous" />;
    }

    if (isMusicPage) {
        return (
             <div className="fixed bottom-0 left-0 right-0 z-50">
                <FullScreenPlayer />
                 {/* The mini-player for the music page, only visible when fullscreen is closed */}
                {!isFullScreenPlayerOpen && (
                     <div 
                        className="fixed bottom-4 right-4 bg-card/90 backdrop-blur-lg border border-border p-3 flex items-center gap-2 animate-fade-in-up rounded-lg shadow-2xl w-80 sm:w-96"
                     >
                        <button className="flex items-center gap-2 flex-1 min-w-0" onClick={() => setIsFullScreenPlayerOpen(true)}>
                            <Image src={currentTrack.artworkUrl100} alt={currentTrack.trackName} width={48} height={48} className="rounded" unoptimized />
                            <div className='flex-1 min-w-0'>
                                <p className="font-bold truncate text-sm">{currentTrack.trackName}</p>
                                <p className="text-xs text-muted-foreground truncate">{currentTrack.artistName}</p>
                            </div>
                        </button>
                        <div className="flex items-center flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); playPrev();}}>
                                <StepBack className="size-5"/>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); handlePlayPause();}}>
                                {isPlaying ? <Pause className="size-5"/> : <Play className="size-5"/>}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); playNext();}}>
                                <StepForward className="size-5"/>
                            </Button>
                             <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-muted-foreground hover:text-primary", isCurrentTrackFavorite && "text-primary")} onClick={(e) => {e.stopPropagation(); toggleCurrentTrackFavorite()}}>
                                <Heart className={cn("size-5", isCurrentTrackFavorite && "fill-primary")} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); closePlayer();}}>
                                <X className="size-5"/>
                            </Button>
                        </div>
                    </div>
                )}
                 <audio ref={audioRef} crossOrigin="anonymous" />
            </div>
        )
    }

    const truncatedTrackName = currentTrack.trackName.length > 11 
        ? `${currentTrack.trackName.substring(0, 11)}...` 
        : currentTrack.trackName;

    // Mini player for other pages
    return (
        <>
        <FullScreenPlayer />
        <div className="fixed bottom-4 right-4 z-50">
             <div 
                className="bg-card/90 backdrop-blur-lg border border-border p-3 flex items-center gap-2 animate-fade-in-up rounded-lg shadow-2xl w-80 sm:w-96"
             >
                <button className="flex items-center gap-2 flex-1 min-w-0" onClick={() => setIsFullScreenPlayerOpen(true)}>
                    <Image src={currentTrack.artworkUrl100} alt={currentTrack.trackName} width={48} height={48} className="rounded" unoptimized />
                    <div className='flex-1 min-w-0'>
                        <p className="font-bold truncate text-sm">{truncatedTrackName}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentTrack.artistName}</p>
                    </div>
                </button>
                <div className="flex items-center flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); playPrev();}}>
                        <StepBack className="size-5"/>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); handlePlayPause();}}>
                        {isPlaying ? <Pause className="size-5"/> : <Play className="size-5"/>}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); playNext();}}>
                        <StepForward className="size-5"/>
                    </Button>
                     <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-muted-foreground hover:text-primary", isCurrentTrackFavorite && "text-primary")} onClick={(e) => {e.stopPropagation(); toggleCurrentTrackFavorite()}}>
                        <Heart className={cn("size-5", isCurrentTrackFavorite && "fill-primary")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); closePlayer();}}>
                        <X className="size-5"/>
                    </Button>
                </div>
            </div>
            <audio ref={audioRef} crossOrigin="anonymous" />
        </div>
        </>
    )
}
