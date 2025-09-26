

export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  coverPhoto: string;
  bio: string;
  role?: 'user' | 'moderator' | 'developer';
};

export type Post = {
  id: string;
  userId: string;
  content: string;
  image?: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: number;
  likes?: Record<string, boolean>;
};

export type Comment = {
  id: string;
  userId: string;
  postId: string;
  content: string;
  createdAt: number;
  user?: User;
}

export type Bookmark = {
    id: string;
    postId: string;
    userId: string;
    bookmarkedAt: number;
}

export type FavoriteTrack = {
  id: string; // Will be the trackId
  userId: string;
  trackId: number;
  artistName: string;
  trackName: string;
  previewUrl: string;
  artworkUrl100: string;
  favoritedAt: any;
};

export type Playlist = {
    id: string;
    userId: string;
    name: string;
    createdAt: any;
    trackCount?: number;
};

export type PlaylistTrack = FavoriteTrack & {
    playlistId: string;
    addedAt: any;
}
