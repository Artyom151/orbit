

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
  track?: {
    trackId: number;
    artistName: string;
    trackName: string;
    previewUrl: string;
    artworkUrl100: string;
  };
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: number;
  likes?: Record<string, boolean>;
  groupId?: string;
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

export type Connection = {
    id: string; // Will be the other user's ID
    status: 'pending' | 'accepted';
    createdAt: number;
};

export type Group = {
    id: string;
    name: string;
    description: string;
    bannerUrl: string;
    createdBy: string;
    createdAt: number;
    memberCount: number;
};

export type GroupMember = {
    id: string; // Will be the user's ID
    userId: string;
    groupId: string;
    joinedAt: number;
};

export type Call = {
  id: string;
  caller: User;
  receiver: User;
  type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'declined';
  createdAt: any;
  // offer?: any; // For WebRTC
  // answer?: any; // For WebRTC
}

    