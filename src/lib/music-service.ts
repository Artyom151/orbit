
'use client';

export type Track = {
    trackId: number;
    artistName: string;
    trackName:string;
    previewUrl: string;
    artworkUrl100: string;
    collectionName: string; // Keep for compatibility, though might be empty
};

export async function searchTracks(term: string, limit = 20): Promise<Track[]> {
    if (!term) return [];

    const searchUrl = `/api/soundcloud/search/tracks?q=${encodeURIComponent(term)}&limit=${limit}`;

    try {
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
            throw new Error(`Search request failed: ${searchResponse.statusText}`);
        }
        const searchResults = await searchResponse.json();

        const tracks = await Promise.all(
            searchResults.collection.map(async (track: any): Promise<Track | null> => {
                const progressiveStreaming = track.media?.transcodings?.find(
                    (t: any) => t.format?.protocol === 'progressive'
                );

                if (!track.id || !track.user || !track.title || !progressiveStreaming?.url) {
                    return null;
                }
                
                const streamUrlObject = new URL(progressiveStreaming.url);
                const params = new URLSearchParams(streamUrlObject.search);
                
                const streamInfoUrl = `/api/soundcloud${streamUrlObject.pathname}?${params.toString()}`;
                
                const streamInfoResponse = await fetch(streamInfoUrl);
                 if (!streamInfoResponse.ok) {
                    console.error(`Failed to get stream info for track ${track.id}: ${streamInfoResponse.statusText}`);
                    return null;
                }
                const streamInfoData = await streamInfoResponse.json();
                const finalStreamUrl = streamInfoData.url;

                if (!finalStreamUrl) {
                    return null;
                }

                return {
                    trackId: track.id,
                    artistName: track.user.username,
                    trackName: track.title,
                    previewUrl: finalStreamUrl,
                    artworkUrl100: track.artwork_url ? track.artwork_url.replace('-large.jpg', '-t120x120.jpg') : 'https://i1.sndcdn.com/artworks-000108293292-8g2olh-large.jpg',
                    collectionName: track.genre || '',
                };
            })
        );

        return tracks.filter((t): t is Track => t !== null);

    } catch (error) {
        console.error("Error searching SoundCloud tracks:", error);
        return [];
    }
}
