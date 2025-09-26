
'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import { searchTracks, type Track } from '@/lib/music-service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Heart, Sparkles, Music, Play, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDatabase, useUser } from '@/firebase';
import { ref, set, serverTimestamp, remove } from 'firebase/database';
import { useList } from '@/firebase/rtdb/use-list';
import type { FavoriteTrack, Playlist, PlaylistTrack } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useMusicPlayer } from '@/context/music-player-context';
import { createMusicMix } from '@/ai/flows/create-music-mix-flow';
import { CreatePlaylistDialog } from '@/components/playlists/create-playlist-dialog';
import { AddToPlaylistPopover } from '@/components/playlists/add-to-playlist-popover';
import { PlaylistView } from '@/components/playlists/playlist-view';

const TrackSkeleton = () => (
    <div className="flex items-center space-x-4 p-2">
        <Skeleton className="h-16 w-16 rounded" />
        <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
        </div>
    </div>
);

const TrackItem = ({ track, onSelect, isFavorite, onToggleFavorite }: { track: Track | FavoriteTrack, onSelect: () => void, isFavorite: boolean, onToggleFavorite: () => void }) => {
    const { toast } = useToast();
    
    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleFavorite();
        toast({
            title: isFavorite ? "Removed from favorites" : "Added to favorites",
        });
    }

    return (
        <Card 
            onClick={onSelect}
            className="p-2 flex items-center gap-4 cursor-pointer hover:bg-secondary transition-colors rounded-lg group"
        >
            <Image src={track.artworkUrl100} alt={track.trackName} width={64} height={64} className="rounded" unoptimized />
            <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{track.trackName}</p>
                <p className="text-sm text-muted-foreground truncate">{track.artistName}</p>
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <AddToPlaylistPopover track={track}>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <Plus />
                    </Button>
                </AddToPlaylistPopover>
                <Button variant="ghost" size="icon" className={cn("text-muted-foreground hover:text-primary", isFavorite && "text-primary")} onClick={handleFavoriteClick}>
                    <Heart className={cn(isFavorite && "fill-primary")} />
                </Button>
            </div>
        </Card>
    );
};


export default function MusicPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [tracks, setTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    const [mixTracks, setMixTracks] = useState<Track[]>([]);
    const [isGeneratingMix, setIsGeneratingMix] = useState(false);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

    const { user } = useUser();
    const db = useDatabase();
    const { toast } = useToast();
    const { selectTrack } = useMusicPlayer();

    const favoriteTracksQuery = useMemo(() => {
        if (!user || !db) return null;
        return ref(db, `favoriteTracks/${user.uid}`);
    }, [user, db]);

    const { data: favoriteTracks, loading: loadingFavorites } = useList<FavoriteTrack>(favoriteTracksQuery);
    const favoriteTrackIds = useMemo(() => new Set(favoriteTracks.map(t => t.trackId)), [favoriteTracks]);
    
    const playlistsQuery = useMemo(() => {
        if (!user || !db) return null;
        return ref(db, `playlists/${user.uid}`);
    }, [user, db]);

    const { data: playlists, loading: loadingPlaylists } = useList<Playlist>(playlistsQuery);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!searchTerm) return;
        setIsLoading(true);
        setHasSearched(true);
        setTracks([]);
        const results = await searchTracks(searchTerm);
        setTracks(results);
        if (results.length === 0) {
             console.warn("Search returned no results. This might be due to a missing or invalid SoundCloud Client ID.");
        }
        setIsLoading(false);
    };
    
    const handleToggleFavorite = async (track: Track | FavoriteTrack) => {
        if (!user || !db) {
            toast({ variant: "destructive", title: "Please log in to save favorites." });
            return;
        }

        const favoriteRef = ref(db, `favoriteTracks/${user.uid}/${track.trackId}`);
        const isCurrentlyFavorite = favoriteTrackIds.has(track.trackId);
        
        const previewUrl = (track as Track).previewUrl || (track as FavoriteTrack).previewUrl;
        if (!previewUrl) {
            toast({ variant: "destructive", title: "Cannot favorite track", description: "This track is missing a playable URL." });
            return;
        }

        if (isCurrentlyFavorite) {
            await remove(favoriteRef);
        } else {
            const favoriteData: Omit<FavoriteTrack, 'id'> & { favoritedAt: any } = {
                userId: user.uid,
                trackId: track.trackId,
                artistName: track.artistName,
                trackName: track.trackName,
                previewUrl: previewUrl,
                artworkUrl100: track.artworkUrl100,
                favoritedAt: serverTimestamp(),
            };
            await set(favoriteRef, favoriteData);
        }
    };
    
    const handleCreateMix = async () => {
        if (favoriteTracks.length === 0) {
            toast({
                title: "Add some favorites first!",
                description: "Like some tracks to generate a mix.",
            });
            return;
        }
        setIsGeneratingMix(true);
        setMixTracks([]);
        try {
            const favoriteTrackInfo = favoriteTracks.map(t => ({ artist: t.artistName, song: t.trackName }));
            const recommended = await createMusicMix({ favorites: favoriteTrackInfo });
            
            const searchPromises = recommended.recommendations.map(r => searchTracks(`${r.artist} ${r.song}`, 1));
            const searchResults = await Promise.all(searchPromises);
            
            const foundTracks = searchResults.flat().filter((t): t is Track => t !== null);
            setMixTracks(foundTracks);

        } catch (error) {
            console.error("Error generating mix:", error);
            toast({
                variant: "destructive",
                title: "Could not generate mix",
                description: "Something went wrong with the AI. Please try again."
            })
        } finally {
            setIsGeneratingMix(false);
        }
    }
    
    const handlePlayFavorites = () => {
        if (favoriteTracks.length > 0) {
            const reversedFavorites = [...favoriteTracks].reverse();
            selectTrack(reversedFavorites[0], 0, reversedFavorites);
        }
    }
    
    if (selectedPlaylistId) {
        return <PlaylistView playlistId={selectedPlaylistId} onBack={() => setSelectedPlaylistId(null)} />;
    }


    return (
        <div className="h-full flex flex-col">
            <Tabs defaultValue="search" className="flex flex-col h-full">
                <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
                    <h1 className="text-xl font-bold mb-4">Music</h1>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="search">Search</TabsTrigger>
                        <TabsTrigger value="mymix">My Mix</TabsTrigger>
                        <TabsTrigger value="playlists">Playlists</TabsTrigger>
                    </TabsList>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    <TabsContent value="search" className="p-4 space-y-4">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input 
                                    placeholder="Search for songs or artists..." 
                                    className="rounded-full pl-10 bg-secondary border-none h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="rounded-full font-bold" disabled={isLoading}>Search</Button>
                        </form>
                        <div className="space-y-2 pb-32">
                          {isLoading ? (
                              Array.from({ length: 10 }).map((_, i) => <TrackSkeleton key={i} />)
                          ) : tracks.length > 0 ? (
                              tracks.map((track, index) => (
                                  <TrackItem 
                                      key={track.trackId}
                                      track={track}
                                      onSelect={() => selectTrack(track, index, tracks)}
                                      isFavorite={favoriteTrackIds.has(track.trackId)}
                                      onToggleFavorite={() => handleToggleFavorite(track)}
                                  />
                              ))
                          ) : (
                              <div className="text-center text-muted-foreground py-8">
                                  {hasSearched ? (
                                      <>
                                          <p>No results found.</p>
                                          <p className="text-xs mt-2">Note: This feature may require a SoundCloud Client ID to be configured.</p>
                                      </>
                                  ) : (
                                      <div className="flex flex-col items-center gap-4">
                                        <Music className="size-16 text-muted" />
                                        <p>Search for your favorite music.</p>
                                      </div>
                                  )}
                              </div>
                          )}
                        </div>
                    </TabsContent>
                    <TabsContent value="mymix" className="p-4 space-y-4">
                        <div className="flex justify-between items-center bg-secondary p-4 rounded-lg">
                           <div>
                             <h2 className="text-lg font-bold">Your personal DJ</h2>
                             <p className="text-sm text-muted-foreground">Generate a mix of new tracks based on your favorites.</p>
                           </div>
                           <Button onClick={handleCreateMix} disabled={isGeneratingMix || loadingFavorites || favoriteTracks.length === 0}>
                                <Sparkles className="mr-2"/>
                                {isGeneratingMix ? "Generating..." : "Create New Mix"}
                           </Button>
                        </div>

                        {isGeneratingMix && (
                             <div className="space-y-2 pb-32">
                                {Array.from({ length: 10 }).map((_, i) => <TrackSkeleton key={i} />)}
                             </div>
                        )}
                        
                        {!isGeneratingMix && mixTracks.length > 0 && (
                            <div className="space-y-2 pb-32">
                                {mixTracks.map((track, index) => (
                                    <TrackItem 
                                        key={track.trackId}
                                        track={track}
                                        onSelect={() => selectTrack(track, index, mixTracks)}
                                        isFavorite={favoriteTrackIds.has(track.trackId)}
                                        onToggleFavorite={() => handleToggleFavorite(track)}
                                    />
                                ))}
                            </div>
                        )}
                        
                        {!isGeneratingMix && mixTracks.length === 0 && (
                             <div className="pb-32">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold">My Favorite Tracks</h3>
                                     <Button onClick={handlePlayFavorites} variant="outline" disabled={favoriteTracks.length === 0}>
                                        <Play className="mr-2"/>
                                        Play All
                                    </Button>
                                </div>
                                {loadingFavorites ? (
                                    Array.from({ length: 5 }).map((_, i) => <TrackSkeleton key={i} />)
                                ) : favoriteTracks.length > 0 ? (
                                    <div className="space-y-2">
                                    {[...favoriteTracks].reverse().map((track, index) => (
                                        <TrackItem 
                                            key={track.trackId}
                                            track={track}
                                            onSelect={() => selectTrack(track, index, [...favoriteTracks].reverse())}
                                            isFavorite={true}
                                            onToggleFavorite={() => handleToggleFavorite(track)}
                                        />
                                    ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground py-8">
                                        <p>Your favorite tracks will appear here.</p>
                                        <p className="text-sm">Use the search to find and like songs.</p>
                                    </div>
                                )}
                             </div>
                        )}
                    </TabsContent>
                    <TabsContent value="playlists" className="p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">My Playlists</h2>
                            <CreatePlaylistDialog />
                        </div>
                        {loadingPlaylists ? (
                             Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                        ) : playlists.length > 0 ? (
                           <div className='grid grid-cols-2 gap-4'>
                             {playlists.map(playlist => (
                                <Card key={playlist.id} className="p-4 flex flex-col justify-between hover:bg-secondary cursor-pointer" onClick={() => setSelectedPlaylistId(playlist.id)}>
                                    <div>
                                        <h3 className="font-bold">{playlist.name}</h3>
                                        <p className="text-sm text-muted-foreground">{playlist.trackCount || 0} tracks</p>
                                    </div>
                                    <Music className="size-8 text-muted self-end"/>
                                </Card>
                            ))}
                           </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <p>You haven't created any playlists yet.</p>
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
