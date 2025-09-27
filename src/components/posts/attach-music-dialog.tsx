
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import React, { useState, useEffect } from 'react';
import type { Track } from '@/lib/music-service';
import { searchTracks } from '@/lib/music-service';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { ScrollArea } from '../ui/scroll-area';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';


type AttachMusicDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTrack: (track: Track) => void;
};

const TrackSkeleton = () => (
    <div className="flex items-center space-x-4 p-2">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
        </div>
    </div>
);


export function AttachMusicDialog({ open, onOpenChange, onSelectTrack }: AttachMusicDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    const search = async () => {
        if (debouncedSearchTerm) {
            setIsLoading(true);
            const tracks = await searchTracks(debouncedSearchTerm, 10);
            setResults(tracks);
            setIsLoading(false);
        } else {
            setResults([]);
        }
    };
    
    search();
    
  }, [debouncedSearchTerm]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Attach Music</DialogTitle>
        </DialogHeader>
        <div className="p-4 pt-0 border-b">
           <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                    placeholder="Search for a song..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <ScrollArea className='h-96'>
            <div className='p-2'>
                {isLoading && (
                  <div className='p-2 space-y-2'>
                    <TrackSkeleton />
                    <TrackSkeleton />
                    <TrackSkeleton />
                  </div>
                )}
                {!isLoading && results.length === 0 && debouncedSearchTerm && (
                  <p className='text-center text-sm text-muted-foreground py-4'>No results found.</p>
                )}
                 {!isLoading && results.length === 0 && !debouncedSearchTerm && (
                  <p className='text-center text-sm text-muted-foreground py-4'>Start typing to search for a song.</p>
                )}
                 {!isLoading && results.length > 0 && (
                    <div className="space-y-1">
                        {results.map(track => (
                            <div 
                                key={track.trackId} 
                                onClick={() => onSelectTrack(track)}
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent"
                                )}
                            >
                                <Image src={track.artworkUrl100} alt={track.trackName} width={40} height={40} className="rounded" unoptimized />
                                <div>
                                    <p className="font-bold text-sm">{track.trackName}</p>
                                    <p className="text-xs text-muted-foreground">{track.artistName}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
